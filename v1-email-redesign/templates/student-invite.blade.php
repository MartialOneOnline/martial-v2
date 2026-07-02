@php
    $language = $language ?? null;
    $appName = config('app.name', 'Martial App');

    $tokenData = [
        'invite_id' => $invite->id,
        'role' => $role,
    ];

    $jsonData = json_encode($tokenData);
    $encodedToken = base64_encode($jsonData);
    $secureUrl = url('register/select-role?token=' . $encodedToken);

    $registerUrl = url('register/select-role?invite_id=' . $invite->id . '&role=' . $role);
    $loginUrl = url('login?invite_id=' . $invite->id . '&role=' . $role);
    $inviterName = getAuthUser()->name ?? getAuthUser()->details->name ?? $user->name;
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Email Confirmation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style type="text/css">
        body, table, td, a {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        table, td {
            mso-table-rspace: 0pt;
            mso-table-lspace: 0pt;
        }

        table {
            border-collapse: collapse !important;
        }

        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }

        body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #F4F7FB;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
        }

        @media only screen and (max-width: 620px) {
            .email-container {
                width: 100% !important;
            }

            .outer-padding {
                padding: 24px 12px 36px !important;
            }

            .mobile-side {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }

            .hero-padding {
                padding: 30px 20px 16px !important;
            }

            .stack-button {
                width: 100% !important;
            }

            .stack-button a {
                display: block !important;
            }

            .section-card {
                margin-bottom: 16px !important;
            }

            .mobile-title {
                font-size: 26px !important;
                line-height: 1.22 !important;
            }
        }
    </style>
</head>

<body style="margin:0; padding:0; background-color:#F4F7FB;">

    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
        {{ get_translate('invited_by',1,'email_invite_user','You have been invited by',$language) }}
        {{ $inviterName }}
        {{ get_translate('to_join_the',1,'email_invite_user','to join the',$language) }}
        {{ $appName }}.
    </div>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F4F7FB;">
        <tr>
            <td class="outer-padding" align="center" style="padding:32px 16px 48px 16px;">

                <table class="email-container" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px; max-width:600px; margin:0 auto;">

                    <tr>
                        <td align="center" style="padding:0 0 20px 0;">
                            <a href="{{ url('/') }}" target="_blank" style="display:inline-block; text-decoration:none; color:#0D1B2A;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                                    <tr>
                                        <td align="center" valign="middle" style="background-color:#0870E2; width:38px; height:38px; border-radius:10px;">
                                            <span style="display:inline-block; color:#FFFFFF; font-size:19px; line-height:38px; font-weight:800;">M</span>
                                        </td>
                                        <td valign="middle" style="padding-left:10px;">
                                            <span style="font-size:18px; line-height:24px; font-weight:700; color:#0D1B2A;">
                                                {{ $appName }}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </a>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#FFFFFF; border:1px solid #E5EAF0; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(15,23,42,0.06);">

                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="height:6px; background-color:#0870E2; font-size:0; line-height:0;">&nbsp;</td>
                                </tr>
                            </table>

                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td class="hero-padding" align="left" style="padding:32px 32px 16px 32px;">
                                        <div style="display:inline-block; background-color:#EFF6FF; border:1px solid #BFDBFE; border-radius:999px; padding:7px 14px; margin-bottom:18px;">
                                            <span style="color:#0870E2; font-size:12px; line-height:16px; font-weight:800;">
                                                Martial App invitation
                                            </span>
                                        </div>

                                        <h1 class="mobile-title" style="margin:0; color:#101828; font-size:30px; line-height:1.25; font-weight:800; letter-spacing:-0.5px;">
                                            {{ get_translate('hello',1,'email','Hello',$language) }} @if($invite->name)<strong>{{ $invite->name }}</strong>@endif,
                                        </h1>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td class="mobile-side" style="padding:0 32px 34px 32px;">

                                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px 0;">
                                            <tr>
                                                <td style="padding:0 0 0 0;">
                                                    <p style="margin:0; color:#475467; font-size:16px; line-height:1.7;">
                                                        {{ get_translate('invited_by',1,'email_invite_user','You have been invited by',$language) }}
                                                        <strong style="color:#101828;">{{ $inviterName }}</strong>
                                                        {{ get_translate('to_join_the',1,'email_invite_user','to join the',$language) }}
                                                        {{ $appName }}
                                                        @if($role == 'school')
                                                            {{ get_translate('community_school',1,'email_invite_user','community as a School',$language) }}.
                                                        @elseif($role == 'student')
                                                            {{ get_translate('community_student',1,'email_invite_user','community as a Student',$language) }}.
                                                        @else
                                                            {{ get_translate('community_staff',1,'email_invite_user','community as a Staff',$language) }}.
                                                        @endif
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <table class="section-card" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F8FAFC; border:1px solid #E5EAF0; border-radius:14px; margin:0 0 18px 0;">
                                            <tr>
                                                <td style="padding:18px 20px;">
                                                    <p style="margin:0 0 16px 0; color:#475467; font-size:15px; line-height:1.65;">
                                                        {{ get_translate('dont_have_account',1,'email_invite_user','If you dont have an account on',$language) }} {{ $appName }}.
                                                    </p>

                                                    <table class="stack-button" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                        <tr>
                                                            <td align="center" bgcolor="#0870E2" style="border-radius:12px;">
                                                                <a href="{{ $registerUrl }}" target="_blank" style="display:inline-block; padding:14px 28px; color:#FFFFFF; font-size:14px; line-height:20px; font-weight:800; text-decoration:none; border-radius:12px; text-transform:uppercase;">
                                                                    {{ get_translate('register_now',1,'email_invite_user','Register Now',$language) }}
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <table class="section-card" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFFFF; border:1px solid #E5EAF0; border-radius:14px; margin:0 0 22px 0;">
                                            <tr>
                                                <td style="padding:18px 20px;">
                                                    <p style="margin:0 0 16px 0; color:#475467; font-size:15px; line-height:1.65;">
                                                        {{ get_translate('already_have_account',1,'email_invite_user','If you already have an account on',$language) }} {{ $appName }}.
                                                    </p>

                                                    <table class="stack-button" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                        <tr>
                                                            <td align="center" bgcolor="#FFFFFF" style="border-radius:12px; border:1px solid #BFDBFE;">
                                                                <a href="{{ $loginUrl }}" target="_blank" style="display:inline-block; padding:14px 28px; color:#0E3A7A; font-size:14px; line-height:20px; font-weight:800; text-decoration:none; border-radius:12px; text-transform:uppercase;">
                                                                    {{ get_translate('sign_in',1,'email_invite_user','SING IN',$language) }}
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFFFF; border-top:1px solid #E5EAF0; margin:0 0 8px 0;">
                                            <tr>
                                                <td style="padding:20px 0 0 0; color:#667085; font-size:13px; line-height:1.7;">
                                                    {{ get_translate('having_trouble_msg',1,'email_invite_user','If you have trble',$language) }}:
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0 0 0; word-break:break-all;">
                                                    <a href="{{ $secureUrl }}" target="_blank" style="color:#0870E2; font-size:12px; line-height:1.7; text-decoration:underline;">
                                                        {{ $secureUrl }}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:26px 0 0 0;">
                                            <tr>
                                                <td style="padding-top:22px; border-top:1px solid #E5EAF0;">
                                                    <p style="margin:0; color:#475467; font-size:15px; line-height:1.7;">
                                                        {{ get_translate('regards',1,'email','Regards',$language) }},<br>
                                                        <strong style="color:#101828;">{{ $appName }}</strong>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>
</body>
</html>
