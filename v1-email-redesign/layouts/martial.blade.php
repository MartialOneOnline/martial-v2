@php
    $emailBackground = '#F4F7FB';
    $emailSurface = '#FFFFFF';
    $emailBorder = '#E5EAF0';
    $emailText = '#101828';
    $emailSecondary = '#667085';
    $emailMuted = '#98A2B3';
    $emailPrimary = '#0870E2';
    $emailNavy = '#0E3A7A';

    $logoUrl = $logoUrl ?? asset('images/martial-logo.png');
    $appName = $appName ?? 'Martial App';
    $supportEmail = $supportEmail ?? 'notifications@martialapp.com';
    $title = $title ?? $appName;
    $preheader = $preheader ?? '';
@endphp
<!DOCTYPE html>
<html lang="{{ $lang ?? 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>{{ $title }}</title>
</head>
<body style="margin:0;padding:0;background:{{ $emailBackground }};color:{{ $emailText }};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    @if(!empty($preheader))
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            {{ $preheader }}
        </div>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:{{ $emailBackground }};">
        <tr>
            <td align="center" style="padding:44px 16px 52px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;">
                    <tr>
                        <td style="background:{{ $emailSurface }};border-radius:30px;padding:38px 34px 34px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                <tr>
                                    <td align="center" style="padding:0 0 26px;">
                                        @include('emails.partials.logo', [
                                            'logoUrl' => $logoUrl,
                                            'appName' => $appName,
                                            'emailNavy' => $emailNavy,
                                            'emailPrimary' => $emailPrimary,
                                        ])
                                    </td>
                                </tr>

                                @yield('content')

                                @include('emails.partials.footer', [
                                    'appName' => $appName,
                                    'supportEmail' => $supportEmail,
                                    'logoUrl' => $logoUrl,
                                    'emailBorder' => $emailBorder,
                                    'emailSecondary' => $emailSecondary,
                                    'emailMuted' => $emailMuted,
                                    'emailPrimary' => $emailPrimary,
                                ])
                            </table>
                        </td>
                    </tr>

                    @if(!empty($legalText ?? null) || !empty($unsubscribeUrl ?? null))
                        <tr>
                            <td align="center" style="padding:28px 18px 0;color:{{ $emailSecondary }};font-size:13px;line-height:20px;">
                                @if(!empty($legalText ?? null))
                                    <p style="margin:0;">{!! $legalText !!}</p>
                                @endif
                                @if(!empty($unsubscribeUrl ?? null))
                                    <p style="margin:6px 0 0;">
                                        <a href="{{ $unsubscribeUrl }}" style="color:{{ $emailSecondary }};text-decoration:underline;">Unsubscribe</a>
                                    </p>
                                @endif
                                <p style="margin:14px 0 0;color:{{ $emailMuted }};">&copy; {{ date('Y') }} {{ $appName }}</p>
                            </td>
                        </tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
