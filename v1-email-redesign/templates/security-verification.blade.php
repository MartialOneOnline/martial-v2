@php
    $title = $title ?? 'Verify your email address';
    $preheader = $preheader ?? 'Confirm your email address to continue using Martial App.';
    $recipientName = $recipientName ?? ($name ?? null);
    $ctaUrl = $ctaUrl ?? ($verificationUrl ?? ($resetUrl ?? '#'));
    $ctaLabel = $ctaLabel ?? 'Verify email';
    $expiryText = $expiryText ?? 'This link expires in 24 hours.';
    $entityName = $entityName ?? ($schoolName ?? ($user->name ?? null));
    $entityLocation = $entityLocation ?? null;
    $legalText = $legalText ?? 'You received this security email because an action was requested on Martial App.';
@endphp
@extends('emails.layouts.martial')

@section('content')
    <tr>
        <td align="center" style="padding:0 0 28px;">
            <h1 style="margin:0;color:#101828;font-size:28px;line-height:35px;font-weight:800;letter-spacing:0;">
                {{ $title }}
            </h1>
            <p style="margin:10px 0 0;color:#667085;font-size:15px;line-height:23px;">
                Confirm this action to continue securely on Martial App.
            </p>
        </td>
    </tr>

    @if($entityName)
        <tr>
            <td style="padding:0 0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0E3A7A;border-radius:22px;overflow:hidden;">
                    <tr>
                        <td align="center" style="padding:28px 24px;">
                            <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.14);border-radius:999px;padding:7px 14px;color:#FFFFFF;font-size:13px;line-height:16px;font-weight:800;">Action required</span>
                            <h2 style="margin:16px 0 0;color:#FFFFFF;font-size:30px;line-height:36px;font-weight:800;">{{ $entityName }}</h2>
                            @if($entityLocation)
                                <p style="margin:10px 0 0;color:#D0D5DD;font-size:15px;line-height:22px;">{{ $entityLocation }}</p>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    @endif

    <tr>
        <td style="padding:0 0 24px;">
            <p style="margin:0;color:#667085;font-size:16px;line-height:25px;">
                {{ $recipientName ? 'Hi '.$recipientName.',' : 'Hi,' }}
            </p>
            <p style="margin:14px 0 0;color:#667085;font-size:16px;line-height:25px;">
                Click the button below to verify this request.
            </p>
        </td>
    </tr>

    <tr>
        <td style="padding:0 0 0;">
            @include('emails.partials.button', ['href' => $ctaUrl, 'label' => $ctaLabel])
            <p style="margin:13px 0 0;color:#98A2B3;font-size:12px;line-height:18px;text-align:center;">
                {{ $expiryText }}
            </p>
        </td>
    </tr>

    @include('emails.partials.divider', ['top' => '28px'])

    <tr>
        <td style="padding:24px 0 0;">
            <p style="margin:0;color:#667085;font-size:14px;line-height:22px;">
                If the button does not work, copy and paste this link into your browser:
            </p>
            <p style="margin:8px 0 0;color:#0870E2;font-size:12px;line-height:18px;word-break:break-all;">
                <a href="{{ $ctaUrl }}" style="color:#0870E2;text-decoration:underline;">{{ $ctaUrl }}</a>
            </p>
            <p style="margin:18px 0 0;color:#667085;font-size:14px;line-height:22px;">
                If you did not request this, you can safely ignore this email.
            </p>
        </td>
    </tr>
@endsection
