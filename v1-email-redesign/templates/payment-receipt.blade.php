@php
    $title = $title ?? 'Payment received';
    $preheader = $preheader ?? 'Your Martial App payment was received.';
    $receiptId = $receiptId ?? ($payment->id ?? null);
    $receiptDate = $receiptDate ?? date('F j, Y');
    $bookingReference = $bookingReference ?? ($reference ?? null);
    $schoolName = $schoolName ?? ($school->name ?? ($user->name ?? 'Martial App'));
    $itemName = $itemName ?? ($planName ?? 'Membership plan');
    $amount = $amount ?? ($payment->amount ?? null);
    $currency = $currency ?? ($payment->currency ?? 'EUR');
    $paymentMethod = $paymentMethod ?? 'Card payment';
    $balanceDue = $balanceDue ?? '0 '.$currency;
    $paymentStatus = $paymentStatus ?? 'Paid';
    $guestName = $guestName ?? ($name ?? null);
    $guestEmail = $guestEmail ?? ($email ?? null);
    $hostedBy = $hostedBy ?? null;
    $location = $location ?? null;
    $dates = $dates ?? null;
    $lengthOfStay = $lengthOfStay ?? null;
    $guestCount = $guestCount ?? null;
    $issuedAt = $issuedAt ?? null;
    $ctaUrl = $ctaUrl ?? '#';
    $legalText = $legalText ?? 'This is your payment confirmation from Martial App.';
@endphp
@extends('emails.layouts.martial')

@section('content')
    <tr>
        <td style="padding:0 0 28px;">
            <h1 style="margin:0;color:#101828;font-size:28px;line-height:35px;font-weight:800;letter-spacing:0;">
                Payment confirmation &amp; receipt
            </h1>
        </td>
    </tr>

    @include('emails.partials.divider')

    <tr>
        <td style="padding:22px 0 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                    <td style="width:33%;padding:0 20px 0 0;vertical-align:top;">
                        <p style="margin:0;color:#667085;font-size:13px;line-height:18px;">Booking reference</p>
                        <p style="margin:6px 0 0;color:#101828;font-size:15px;line-height:21px;font-weight:800;">{{ $bookingReference ?: '-' }}</p>
                    </td>
                    <td style="width:33%;padding:0 20px 0 0;vertical-align:top;">
                        <p style="margin:0;color:#667085;font-size:13px;line-height:18px;">Receipt reference</p>
                        <p style="margin:6px 0 0;color:#101828;font-size:15px;line-height:21px;font-weight:800;">{{ $receiptId ?: '-' }}</p>
                    </td>
                    <td style="width:34%;vertical-align:top;">
                        <p style="margin:0;color:#667085;font-size:13px;line-height:18px;">Issued</p>
                        <p style="margin:6px 0 0;color:#101828;font-size:15px;line-height:21px;font-weight:800;">{{ $issuedAt ?: $receiptDate }}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    @include('emails.partials.divider')

    <tr>
        <td style="padding:28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
                <tr>
                    <td style="width:48%;padding:0 16px 0 0;vertical-align:top;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5EAF0;border-radius:20px;">
                            <tr>
                                <td style="padding:22px 22px 18px;">
                                    <h3 style="margin:0 0 18px;color:#101828;font-size:20px;line-height:26px;font-weight:800;">Guest</h3>
                                    @if($guestName)
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                            @include('emails.partials.detail-row', ['label' => 'Booker', 'value' => $guestName])
                                            @if($guestEmail)
                                                @include('emails.partials.detail-row', ['label' => 'Email', 'value' => $guestEmail])
                                            @endif
                                        </table>
                                    @else
                                        <p style="margin:0;color:#667085;font-size:15px;line-height:22px;">Guest details unavailable.</p>
                                    @endif
                                </td>
                            </tr>
                        </table>

                        <div style="height:16px;font-size:16px;line-height:16px;">&nbsp;</div>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5EAF0;border-radius:20px;">
                            <tr>
                                <td style="padding:22px 22px 18px;">
                                    <h3 style="margin:0 0 18px;color:#101828;font-size:20px;line-height:26px;font-weight:800;">Stay</h3>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        @include('emails.partials.detail-row', ['label' => 'Property', 'value' => $schoolName])
                                        @if($hostedBy)
                                            @include('emails.partials.detail-row', ['label' => 'Hosted by', 'value' => $hostedBy])
                                        @endif
                                        @if($location ?? null)
                                            @include('emails.partials.detail-row', ['label' => 'Location', 'value' => $location])
                                        @endif
                                        @if($dates)
                                            @include('emails.partials.detail-row', ['label' => 'Dates', 'value' => $dates])
                                        @endif
                                        @if($lengthOfStay)
                                            @include('emails.partials.detail-row', ['label' => 'Length of stay', 'value' => $lengthOfStay])
                                        @endif
                                        @if($guestCount)
                                            @include('emails.partials.detail-row', ['label' => 'Guests', 'value' => $guestCount])
                                        @endif
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td style="width:52%;vertical-align:top;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5EAF0;border-radius:20px;">
                            <tr>
                                <td style="padding:22px 22px 18px;">
                                    <h3 style="margin:0 0 18px;color:#101828;font-size:20px;line-height:26px;font-weight:800;">Price breakdown</h3>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        @include('emails.partials.detail-row', ['label' => $itemName, 'value' => $amount ? $amount.' '.$currency : '-'])
                                        @include('emails.partials.detail-row', ['label' => 'Total price', 'value' => $amount ? '<strong>'.$amount.' '.$currency.'</strong>' : '-'])
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="height:16px;font-size:16px;line-height:16px;">&nbsp;</div>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5EAF0;border-radius:20px;">
                            <tr>
                                <td style="padding:22px 22px 18px;">
                                    <h3 style="margin:0 0 18px;color:#101828;font-size:20px;line-height:26px;font-weight:800;">Payment</h3>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        @include('emails.partials.detail-row', ['label' => 'Amount paid', 'value' => $amount ? $amount.' '.$currency : '-'])
                                        @include('emails.partials.detail-row', ['label' => 'Balance due', 'value' => $balanceDue])
                                        @include('emails.partials.detail-row', ['label' => 'Payment status', 'value' => '<span style="display:inline-block;background:#ECFDF3;border:1px solid #ABEFC6;border-radius:999px;padding:4px 9px;color:#027A48;font-size:12px;line-height:14px;font-weight:800;">'.$paymentStatus.'</span>', 'escapeValue' => false])
                                        @include('emails.partials.detail-row', ['label' => 'Payment method', 'value' => $paymentMethod])
                                        @include('emails.partials.detail-row', ['label' => 'Currency', 'value' => $currency])
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    @if($ctaUrl !== '#')
        @include('emails.partials.divider')
        <tr>
            <td style="padding:28px 0 0;">
                @include('emails.partials.button', ['href' => $ctaUrl, 'label' => 'Open receipt'])
            </td>
        </tr>
    @endif
@endsection
