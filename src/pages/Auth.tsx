import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Recycle, ShieldCheck, UserPlus } from 'lucide-react';
import { Logo } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { useAuth } from '../auth/AuthContext';
import { CognitoError } from '../auth/cognito';

/** Cognito error code -> operator message (honest, no invented state). */
export function authMessage(err: unknown): string {
  if (err instanceof CognitoError) {
    switch (err.code) {
      case 'NotAuthorizedException':
        return 'Incorrect email or password.';
      case 'UserNotFoundException':
      case 'UserDoesNotExistException':
        return 'No account exists for this email.';
      case 'UserNotConfirmedException':
        return 'This account is not verified yet - enter the code from your email.';
      case 'UsernameExistsException':
        return 'An account with this email already exists - sign in instead.';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters with upper, lower, number and symbol.';
      case 'InvalidParameterException':
        return 'Check the entered details - email format or password strength.';
      case 'CodeMismatchException':
        return 'That verification code is incorrect.';
      case 'ExpiredCodeException':
        return 'That code has expired - sign up again to receive a fresh one.';
      case 'TooManyRequestsException':
      case 'LimitExceededException':
        return 'Too many attempts - wait a minute and try again.';
      case 'NetworkError':
        return 'Cannot reach the authentication service - check your connection.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

const PERKS = [
  { icon: ShieldCheck, text: 'Your listings are private to your account' },
  { icon: Recycle, text: 'Publish loads to verified recyclers in minutes' },
  { icon: LogIn, text: 'Sessions persist across visits - sign in once' },
] as const;

function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className='grid min-h-dvh place-items-center bg-void px-4 py-10'>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className='w-full max-w-sm'>
        <div className='mb-6 flex flex-col items-center text-center'>
          <a href='#/' aria-label='EcoKart home' className='mb-4'><Logo size={22} /></a>
          <h1 className='font-display text-xl font-semibold text-ink'>{title}</h1>
          <p className='mt-1 text-sm text-ink-soft'>{subtitle}</p>
        </div>
        <div className='rounded-xl border border-line bg-surface p-6'>{children}</div>
        <div className='mt-4 text-center text-sm text-ink-soft'>{footer}</div>
      </motion.div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return <p role='alert' className='rounded-md border border-down/30 bg-down/10 px-3 py-2 text-xs leading-relaxed text-down'>{message}</p>;
}

/** Sign-up + email confirmation code entry (Phase 3). */
export function SignUp() {
  const { signUp, confirmSignUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'form' | 'confirm'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (stage === 'form') {
        const { confirmed } = await signUp(email, password);
        if (confirmed) {
          window.location.hash = '#/signin?notice=verified';
          return;
        }
        setStage('confirm');
      } else {
        await confirmSignUp(email, code);
        window.location.hash = '#/signin?notice=verified';
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title='Create your account'
      subtitle='List recyclable loads for verified recyclers'
      footer={<span>Already registered? <a className='font-medium text-accent hover:underline' href='#/signin'>Sign in</a></span>}
    >
      <form onSubmit={submit} className='space-y-4' noValidate>
        {stage === 'form' ? (
          <>
            <Field label='Email' htmlFor='su-email' required>
              <Input id='su-email' type='email' autoComplete='email' required value={email} onChange={(e) => setEmail(e.target.value)} placeholder='you@company.in' />
            </Field>
            <Field label='Password' htmlFor='su-password' required hint='Min 8 chars with upper, lower, number and symbol.'>
              <Input id='su-password' type='password' autoComplete='new-password' required value={password} onChange={(e) => setPassword(e.target.value)} placeholder='********' />
            </Field>
          </>
        ) : (
          <Field label='Verification code' htmlFor='su-code' required hint={'Sent to ' + email}>
            <Input id='su-code' inputMode='numeric' autoComplete='one-time-code' required value={code} onChange={(e) => setCode(e.target.value)} placeholder='123456' />
          </Field>
        )}
        <ErrorNote message={error} />
        <Button type='submit' loading={busy} className='w-full' icon={<UserPlus size={15} />}>
          {stage === 'form' ? 'Create account' : 'Verify & continue'}
        </Button>
      </form>
      <ul className='mt-5 space-y-2 border-t border-line pt-4'>
        {PERKS.map((p) => (
          <li key={p.text} className='flex items-start gap-2 text-xs text-ink-soft'>
            <p.icon size={13} className='mt-0.5 shrink-0 text-accent' aria-hidden />
            {p.text}
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}

/** Sign-in with session persistence (Phase 3). */
export function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verified = window.location.hash.includes('notice=verified');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      window.location.hash = '#/dashboard';
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title='Welcome back'
      subtitle='Sign in to manage your listings'
      footer={<span>New to EcoKart? <a className='font-medium text-accent hover:underline' href='#/signup'>Create an account</a></span>}
    >
      {verified && (
        <p className='mb-4 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent'>
          Email verified. Sign in to continue.
        </p>
      )}
      <form onSubmit={submit} className='space-y-4' noValidate>
        <Field label='Email' htmlFor='si-email' required>
          <Input id='si-email' type='email' autoComplete='email' required value={email} onChange={(e) => setEmail(e.target.value)} placeholder='you@company.in' />
        </Field>
        <Field label='Password' htmlFor='si-password' required>
          <Input id='si-password' type='password' autoComplete='current-password' required value={password} onChange={(e) => setPassword(e.target.value)} placeholder='********' />
        </Field>
        <ErrorNote message={error} />
        <Button type='submit' loading={busy} className='w-full' icon={<LogIn size={15} />}>Sign in</Button>
      </form>
    </AuthShell>
  );
}
