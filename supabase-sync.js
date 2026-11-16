'use strict';

const signInForm = $('#sign-in');
const syncStatus = $('#auth-status');
const ledgerShell = $('#ledger-shell');
const authScreen = $('#auth-screen');
const retryButton = $('#retry-ledger');
const signOutButtons = document.querySelectorAll('[data-sign-out]');
let supabaseClient;
let ownerId;
let revision;
let ledgerReady = false;
let pendingSave = false;
let loadVersion = 0;
let browserBackup = null;

function lockLedger() {
  loadVersion++;
  ownerId = undefined;
  revision = undefined;
  ledgerReady = false;
  pendingSave = false;
  browserBackup = null;
  state = blank();
  $('#screen').textContent = '';
  $('#form').textContent = '';
  $('#toast').textContent = '';
  $('#restore-file').value = '';
  activeForm = null;
  txFilter = {type:'',category:'',account:''};
  period = 'month';
  custom = {from:thisMonth(),to:today()};
  $('#dialog').close();
  ledgerShell.hidden = true;
  authScreen.hidden = false;
  retryButton.hidden = true;
  $('#switch-account').hidden = true;
}

async function openLedger(userId) {
  if (userId === ownerId) return;
  lockLedger();
  ownerId = userId;
  signInForm.hidden = Boolean(userId);
  syncStatus.textContent = '';
  if (!userId) return;

  const currentLoad = loadVersion;
  syncStatus.textContent = 'در حال دریافت اطلاعات…';
  $('#switch-account').hidden = false;
  try {
    const { data, error } = await supabaseClient.from('dakhl_ledgers')
      .select('revision,ledger').eq('user_id', userId).maybeSingle();
    if (currentLoad !== loadVersion) return;
    if (error) throw error;
    state = data ? validate(data.ledger) : blank();
    revision = data?.revision;
    if (!data) {
      try {
        const backup = localStorage.getItem(key);
        if (backup) browserBackup = validate(JSON.parse(backup));
      } catch {
        // File import remains available if browser storage is inaccessible.
      }
    }
    ledgerReady = true;
    render();
    authScreen.hidden = true;
    ledgerShell.hidden = false;
  } catch {
    if (currentLoad !== loadVersion) return;
    syncStatus.textContent = 'اطلاعات دریافت نشد. دوباره تلاش کنید.';
    retryButton.hidden = false;
  }
}

async function commit(next) {
  validate(next);
  if (!ledgerReady || pendingSave) throw Error('لطفاً صبر کنید تا عملیات فعلی تمام شود.');
  const currentLoad = loadVersion;
  const userId = ownerId;
  const nextRevision = crypto.randomUUID();
  const changes = {revision: nextRevision, ledger: next};
  pendingSave = true;
  $('#form').querySelector('fieldset')?.setAttribute('disabled', '');
  try {
    const table = supabaseClient.from('dakhl_ledgers');
    const request = revision
      ? table.update(changes).eq('user_id', userId).eq('revision', revision)
      : table.insert({user_id: userId, ...changes});
    const { data, error } = await request.select('revision').maybeSingle();
    if (currentLoad !== loadVersion) return false;
    if ((!data && !error) || error?.code === '23505') {
      throw Error('اطلاعات در دستگاه یا برگه دیگری تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.');
    }
    if (error) throw Error('ذخیره تأیید نشد. اتصال را بررسی کنید و دوباره تلاش کنید.');
    revision = data.revision;
    state = next;
    browserBackup = null;
    return true;
  } finally {
    if (currentLoad === loadVersion) {
      pendingSave = false;
      $('#form').querySelector('fieldset')?.removeAttribute('disabled');
    }
  }
}

function startSync() {
  const config = window.DAKHL_SUPABASE;
  if (!config?.url || !config.publishableKey?.startsWith('sb_publishable_')) {
    syncStatus.textContent = 'اتصال به پایگاه داده هنوز تنظیم نشده است.';
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { detectSessionInUrl: false }
    });
  } catch {
    syncStatus.textContent = 'اتصال به سرویس ورود برقرار نشد. صفحه را تازه کنید.';
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      if (!session && ownerId === undefined) {
        signInForm.hidden = false;
        syncStatus.textContent = '';
      } else {
        void openLedger(session?.user.id);
      }
    }, 0);
  });

  signInForm.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(signInForm);
    const submit = signInForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    syncStatus.textContent = 'در حال ورود…';
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: String(fields.get('email')).trim(),
        password: String(fields.get('password'))
      });
      if (error) throw error;
      signInForm.reset();
    } catch (error) {
      syncStatus.textContent = error.code === 'invalid_credentials'
        ? 'ایمیل یا رمز عبور درست نیست.'
        : 'ورود انجام نشد. دوباره تلاش کنید.';
    } finally {
      submit.disabled = false;
    }
  });

  retryButton.addEventListener('click', () => {
    const userId = ownerId;
    ownerId = undefined;
    void openLedger(userId);
  });

  for (const button of signOutButtons) {
    button.addEventListener('click', async () => {
      if (pendingSave) return message('لطفاً صبر کنید تا ذخیره تمام شود.');
      button.disabled = true;
      try {
        const { error } = await supabaseClient.auth.signOut({scope:'local'});
        if (error) throw error;
        lockLedger();
        signInForm.hidden = false;
        syncStatus.textContent = '';
      } catch {
        const text = 'خروج انجام نشد. دوباره تلاش کنید.';
        if (ledgerReady) message(text);
        else syncStatus.textContent = text;
      } finally {
        button.disabled = false;
      }
    });
  }
}
