<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Payments\Application\ProcessStripeWebhookAction;
use App\Modules\Payments\Http\Resources\PaymentProviderEventResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StripeWebhookController
{
    public function __invoke(Request $request, ProcessStripeWebhookAction $processWebhook): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');

        if ($signature === '') {
            throw new BadRequestHttpException('Missing Stripe-Signature header.');
        }

        try {
            $result = $processWebhook->execute($payload, $signature);
        } catch (NotFoundHttpException $e) {
            return response()->json([
                'error' => [
                    'code' => 'payment_not_found',
                    'message' => $e->getMessage(),
                ],
            ], 404);
        }

        return PaymentProviderEventResource::make($result['event'])
            ->additional([
                'payment_id' => $result['payment']?->id ? (string) $result['payment']->id : null,
                'payment_status' => $result['payment']?->status->value,
            ])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }
}
