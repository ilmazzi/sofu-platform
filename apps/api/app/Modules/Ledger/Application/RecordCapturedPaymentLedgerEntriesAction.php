<?php

namespace App\Modules\Ledger\Application;

use App\Modules\Ledger\Domain\Enums\LedgerEntryDirection;
use App\Modules\Ledger\Domain\LedgerAccounts;
use App\Modules\Ledger\Infrastructure\Eloquent\LedgerEntry;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Support\Audit\AuditLogger;

class RecordCapturedPaymentLedgerEntriesAction
{
    private const PROVIDER_FEE_BASIS_POINTS = 270;

    private const SOFU_FEE_BASIS_POINTS = 230;

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Payment $payment): void
    {
        if (LedgerEntry::query()->where('source_type', $payment->getMorphClass())->where('source_id', $payment->id)->exists()) {
            return;
        }

        $payment->loadMissing('reservation.campaign');

        $grossAmountCents = $payment->amount_cents;
        $providerFeeCents = $this->basisPoints($grossAmountCents, self::PROVIDER_FEE_BASIS_POINTS);
        $sofuFeeCents = $this->basisPoints($grossAmountCents, self::SOFU_FEE_BASIS_POINTS);
        $creatorPayableCents = $grossAmountCents - $providerFeeCents - $sofuFeeCents;
        $creatorId = $payment->reservation->campaign->creator_id;

        $metadata = [
            'payment_id' => $payment->id,
            'reservation_id' => $payment->reservation_id,
            'campaign_id' => $payment->reservation->campaign_id,
        ];

        $this->entry(LedgerAccounts::PLATFORM_CASH, LedgerEntryDirection::Credit, $grossAmountCents, $payment, $metadata);
        $this->entry(LedgerAccounts::PROVIDER_FEES, LedgerEntryDirection::Debit, $providerFeeCents, $payment, $metadata + [
            'basis_points' => self::PROVIDER_FEE_BASIS_POINTS,
        ]);
        $this->entry(LedgerAccounts::SOFU_REVENUE, LedgerEntryDirection::Credit, $sofuFeeCents, $payment, $metadata + [
            'basis_points' => self::SOFU_FEE_BASIS_POINTS,
        ]);
        $this->entry(LedgerAccounts::creatorPayable($creatorId), LedgerEntryDirection::Credit, $creatorPayableCents, $payment, $metadata);

        $this->audit->record('ledger.entries_recorded', null, $payment, [
            'gross_amount_cents' => $grossAmountCents,
            'provider_fee_cents' => $providerFeeCents,
            'sofu_fee_cents' => $sofuFeeCents,
            'creator_payable_cents' => $creatorPayableCents,
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function entry(string $account, LedgerEntryDirection $direction, int $amountCents, Payment $payment, array $metadata): LedgerEntry
    {
        return LedgerEntry::create([
            'account' => $account,
            'direction' => $direction,
            'amount_cents' => $amountCents,
            'currency' => $payment->currency,
            'source_type' => $payment->getMorphClass(),
            'source_id' => $payment->id,
            'metadata' => $metadata,
        ]);
    }

    private function basisPoints(int $amountCents, int $basisPoints): int
    {
        return (int) round($amountCents * $basisPoints / 10000);
    }
}
