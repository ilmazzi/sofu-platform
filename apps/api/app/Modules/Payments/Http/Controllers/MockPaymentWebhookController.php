<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Payments\Application\ProcessMockPaymentWebhookAction;
use App\Modules\Payments\Http\Requests\MockPaymentWebhookRequest;
use App\Modules\Payments\Http\Resources\PaymentProviderEventResource;
use Illuminate\Http\JsonResponse;

class MockPaymentWebhookController
{
    public function __invoke(
        MockPaymentWebhookRequest $request,
        ProcessMockPaymentWebhookAction $processWebhook,
    ): JsonResponse {
        $result = $processWebhook->execute($request->validated());

        return PaymentProviderEventResource::make($result['event'])
            ->additional([
                'payment_id' => $result['payment']?->id ? (string) $result['payment']->id : null,
                'payment_status' => $result['payment']?->status->value,
            ])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }
}
