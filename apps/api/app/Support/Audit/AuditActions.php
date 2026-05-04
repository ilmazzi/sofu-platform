<?php

declare(strict_types=1);

namespace App\Support\Audit;

/** Canonical audit_log.action values — use with {@see AuditLogger::record}. */
final class AuditActions
{
    public const IDENTITY_REGISTERED = 'identity.registered';

    public const IDENTITY_LOGGED_IN = 'identity.logged_in';

    public const IDENTITY_LOGGED_OUT = 'identity.logged_out';

    public const IDENTITY_PASSWORD_RESET_REQUESTED = 'identity.password_reset_requested';

    public const IDENTITY_PASSWORD_RESET_COMPLETED = 'identity.password_reset_completed';

    public const IDENTITY_PASSWORD_UPDATED = 'identity.password_updated';

    public const IDENTITY_EMAIL_VERIFICATION_REQUESTED = 'identity.email_verification_requested';

    public const IDENTITY_EMAIL_VERIFIED = 'identity.email_verified';

    public const CAMPAIGN_CREATED = 'campaign.created';

    public const CAMPAIGN_UPDATED = 'campaign.updated';

    public const CAMPAIGN_DELETED = 'campaign.deleted';

    public const CAMPAIGN_WITHDRAWN_FROM_REVIEW = 'campaign.withdrawn_from_review';

    public const CAMPAIGN_SUBMITTED_FOR_REVIEW = 'campaign.submitted_for_review';

    public const CAMPAIGN_APPROVED = 'campaign.approved';

    public const CAMPAIGN_REJECTED = 'campaign.rejected';

    public const CAMPAIGN_PUBLISHED = 'campaign.published';

    public const CAMPAIGN_ACTIVATED = 'campaign.activated';

    public const CAMPAIGN_SUCCESSFUL = 'campaign.successful';

    public const CAMPAIGN_CLOSED = 'campaign.closed';

    public const CAMPAIGN_CANCELLED = 'campaign.cancelled';

    public const CAMPAIGN_EXPIRED = 'campaign.expired';

    public const CAMPAIGN_FAILED = 'campaign.failed';

    public const CAMPAIGN_STATUS_CHANGED = 'campaign.status_changed';

    public const CAMPAIGN_PRICE_CHANGED = 'campaign.price_changed';

    public const RESERVATION_CREATED = 'reservation.created';

    public const RESERVATION_CANCELLED = 'reservation.cancelled';

    public const PAYMENT_INTENT_CREATED = 'payment.intent_created';

    public const PAYMENT_AUTHORIZED = 'payment.authorized';

    public const PAYMENT_CAPTURED = 'payment.captured';

    public const PAYMENT_FAILED = 'payment.failed';

    public const PAYMENT_UPDATED = 'payment.updated';

    public const LEDGER_ENTRIES_RECORDED = 'ledger.entries_recorded';

    public const USER_ROLE_UPDATED = 'user.role_updated';
}
