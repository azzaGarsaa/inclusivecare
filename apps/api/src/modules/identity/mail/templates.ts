import type { Locale } from '../../../generated/prisma/client.js';

export type AuthMailKind = 'verifyEmail' | 'resetPassword' | 'alreadyRegistered';

interface Copy {
  subject: string;
  greeting: (firstName: string) => string;
  body: string;
  action: string;
  footer: string;
}

const COPY: Record<Locale, Record<AuthMailKind, Copy>> = {
  en: {
    verifyEmail: {
      subject: 'Confirm your email address',
      greeting: (name) => `Hello ${name},`,
      body: 'Welcome to InclusiveCare. Please confirm your email address to activate your account. This link is valid for 24 hours.',
      action: 'Confirm my email address',
      footer: 'If you did not create an account, you can ignore this message.',
    },
    resetPassword: {
      subject: 'Reset your password',
      greeting: (name) => `Hello ${name},`,
      body: 'We received a request to reset your InclusiveCare password. This link is valid for 1 hour and can be used once.',
      action: 'Choose a new password',
      footer: 'If you did not ask for this, you can ignore this message. Your password will not change.',
    },
    alreadyRegistered: {
      subject: 'You already have an account',
      greeting: (name) => `Hello ${name},`,
      body: 'Someone tried to create an InclusiveCare account with this email address, but one already exists. You can sign in, or reset your password if you have forgotten it.',
      action: 'Sign in',
      footer: 'If this was not you, no action is needed.',
    },
  },
  fr: {
    verifyEmail: {
      subject: 'Confirmez votre adresse e-mail',
      greeting: (name) => `Bonjour ${name},`,
      body: 'Bienvenue sur InclusiveCare. Veuillez confirmer votre adresse e-mail pour activer votre compte. Ce lien est valable 24 heures.',
      action: 'Confirmer mon adresse e-mail',
      footer: "Si vous n'avez pas créé de compte, vous pouvez ignorer ce message.",
    },
    resetPassword: {
      subject: 'Réinitialisez votre mot de passe',
      greeting: (name) => `Bonjour ${name},`,
      body: 'Nous avons reçu une demande de réinitialisation de votre mot de passe InclusiveCare. Ce lien est valable 1 heure et ne peut être utilisé qu’une seule fois.',
      action: 'Choisir un nouveau mot de passe',
      footer:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message. Votre mot de passe ne changera pas.",
    },
    alreadyRegistered: {
      subject: 'Vous avez déjà un compte',
      greeting: (name) => `Bonjour ${name},`,
      body: 'Quelqu’un a tenté de créer un compte InclusiveCare avec cette adresse e-mail, mais un compte existe déjà. Vous pouvez vous connecter, ou réinitialiser votre mot de passe si vous l’avez oublié.',
      action: 'Se connecter',
      footer: "Si ce n'était pas vous, aucune action n'est nécessaire.",
    },
  },
  ar: {
    verifyEmail: {
      subject: 'تأكيد عنوان بريدك الإلكتروني',
      greeting: (name) => `مرحباً ${name}،`,
      body: 'مرحباً بك في InclusiveCare. يرجى تأكيد عنوان بريدك الإلكتروني لتفعيل حسابك. هذا الرابط صالح لمدة 24 ساعة.',
      action: 'تأكيد بريدي الإلكتروني',
      footer: 'إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة.',
    },
    resetPassword: {
      subject: 'إعادة تعيين كلمة المرور',
      greeting: (name) => `مرحباً ${name}،`,
      body: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في InclusiveCare. هذا الرابط صالح لمدة ساعة واحدة ويُستخدم مرة واحدة فقط.',
      action: 'اختيار كلمة مرور جديدة',
      footer: 'إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة ولن تتغير كلمة المرور.',
    },
    alreadyRegistered: {
      subject: 'لديك حساب بالفعل',
      greeting: (name) => `مرحباً ${name}،`,
      body: 'حاول شخص ما إنشاء حساب في InclusiveCare بهذا البريد الإلكتروني، لكن يوجد حساب مسجّل به بالفعل. يمكنك تسجيل الدخول أو إعادة تعيين كلمة المرور إذا نسيتها.',
      action: 'تسجيل الدخول',
      footer: 'إذا لم تكن أنت، فلا حاجة لاتخاذ أي إجراء.',
    },
  },
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderAuthMail(kind: AuthMailKind, locale: Locale, firstName: string, link: string) {
  const copy = COPY[locale][kind];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const greeting = copy.greeting(firstName);

  const text = [greeting, '', copy.body, '', `${copy.action}: ${link}`, '', copy.footer].join('\n');

  // Plain, high-contrast markup: readable in every mail client and by screen readers.
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1f2933;">
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(copy.body)}</p>
    <p>
      <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#0b6e6e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(copy.action)}</a>
    </p>
    <p style="word-break:break-all;"><a href="${escapeHtml(link)}" style="color:#0b6e6e;">${escapeHtml(link)}</a></p>
    <p style="color:#52606d;">${escapeHtml(copy.footer)}</p>
  </body>
</html>`;

  return { subject: copy.subject, text, html };
}
