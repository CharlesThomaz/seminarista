import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB3yXWkqrLhRMTk6WdEWNiCGun26sMrgEc',
  authDomain: 'seminarista.firebaseapp.com',
  projectId: 'seminarista',
  storageBucket: 'seminarista.firebasestorage.app',
  messagingSenderId: '507614373821',
  appId: '1:507614373821:web:0bca63deda2af179b154d4',
  measurementId: 'G-CE39953LFM'
};

const auth = getAuth(initializeApp(firebaseConfig));
const db = getFirestore();
const googleProvider = new GoogleAuthProvider();
const modules = [
  ['Introdução à Teologia', 'Fundamentos epistemológicos, fontes e divisões da teologia.', 'introducao-a-teologia', 'Fundamentos'],
  ['Bíblia e Revelação', 'A Palavra revelada e os caminhos da inspiração bíblica.', 'biblia-e-revelacao', 'Escrituras'],
  ['Hermenêutica Bíblica', 'Princípios para interpretar e aplicar o texto sagrado.', 'hermeneutica-biblica', 'Escrituras'],
  ['Deus e a Trindade', 'A natureza de Deus e o mistério da Trindade.', 'deus-e-a-trindade', 'Teologia própria'],
  ['Cristologia', 'A pessoa, a obra e a missão de Jesus Cristo.', 'cristologia', 'Cristologia'],
  ['Pneumatologia', 'O Espírito Santo e sua ação na vida da Igreja.', 'pneumatologia', 'Doutrina'],
  ['Antropologia Teológica', 'A pessoa humana, criação, queda e dignidade.', 'antropologia-teologica', 'Doutrina'],
  ['Soteriologia', 'Salvação, graça, fé e a nova vida em Cristo.', 'soteriologia', 'Doutrina'],
  ['Eclesiologia', 'A Igreja, sua identidade, vocação e missão.', 'eclesiologia', 'Igreja'],
  ['História do Cristianismo', 'Os principais períodos e movimentos da história cristã.', 'historia-do-cristianismo', 'História'],
  ['Ética Cristã e Vida Prática', 'Decisões, caráter e testemunho no cotidiano.', 'etica-crista-e-vida-pratica', 'Vida cristã'],
  ['Ministério, Liderança e Missão', 'Serviço, liderança saudável e chamado missionário.', 'ministerio-lideranca-e-missao', 'Missão']
];

let currentUser = null;
let completed = new Set(JSON.parse(localStorage.getItem('seminario-completed') || '[]'));
let finalExamPassed = localStorage.getItem('seminario-exam-passed') === 'true';
let activeFilter = 'all';
let searchQuery = '';
let moduleQuizState = JSON.parse(localStorage.getItem('seminario-module-quiz') || '{}');
const $ = (selector) => document.querySelector(selector);

function getModuleQuizState(index) {
  if (!moduleQuizState[index]) {
    moduleQuizState[index] = { passed: false, score: 0, answers: {} };
  }
  return moduleQuizState[index];
}
const notesInput = $('#notes-input');
const churchNameInput = $('#church-name');
const termsAcceptedInput = $('#terms-accepted');
const profileNameInput = $('#profile-name-input');
const profileEmailInput = $('#profile-email-input');
const profilePhoneInput = $('#profile-phone-input');
const profileChurchInput = $('#profile-church-input');
const profileCourseInput = $('#profile-course-input');
const profileTermsAcceptedInput = $('#profile-terms-accepted');
const authGate = $('#auth-gate');
const authMessage = $('#auth-message');
const notesStatus = $('#notes-status');
const profileFormStatus = $('#profile-form-status');
const summaryAvatar = $('#summary-avatar');
const summaryName = $('#summary-name');
const summaryEmail = $('#summary-email');
const summaryChurch = $('#summary-church');
const summaryPhone = $('#summary-phone');
const summaryCourse = $('#summary-course');
if (notesInput) notesInput.value = localStorage.getItem('seminario-notes') || '';

function moduleFile(slug) {
  const number = String(modules.findIndex((item) => item[2] === slug) + 1).padStart(2, '0');
  return `../../documentos/apostilas/modulo-${number}-${slug}.pdf`;
}
function renderCard(item, index) {
  const [title, description, slug, category] = item;
  const done = completed.has(index);
  return `<article class="module-card ${done ? 'completed' : ''}"><div class="card-top"><span class="card-number">${String(index + 1).padStart(2, '0')}</span><span class="card-status">${done ? '✓ Concluído' : category}</span></div><h3>${title}</h3><p>${description}</p><div class="card-bottom"><span>▣ Apostila em PDF</span><button class="card-link" data-open="${slug}">${done ? 'Revisar' : 'Estudar'} <span>→</span></button></div></article>`;
}
function renderModules(target, list = modules) { target.innerHTML = list.map((item) => renderCard(item, modules.indexOf(item))).join(''); }
function renderFilteredModules() {
  const filtered = modules.filter((item, index) => {
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'completed' ? completed.has(index) : !completed.has(index));
    return matchesFilter && item.slice(0, 2).join(' ').toLowerCase().includes(searchQuery);
  });
  renderModules($('#all-module-grid'), filtered);
}
function updateProgress() {
  const percentage = Math.round((completed.size / modules.length) * 100);
  $('#progress-value').textContent = `${percentage}%`;
  $('#progress-bar').style.width = `${percentage}%`;
  $('#progress-label').textContent = `${completed.size} de ${modules.length} módulos concluídos`;
  updateExamAccess();
}
function updateExamAccess() {
  const available = completed.size === modules.length;
  const examButton = $('#exam-button');
  examButton.disabled = !available;
  examButton.innerHTML = available ? 'Prova final <span>→</span>' : 'Prova final <span>🔒</span>';
  $('#certificate-button').disabled = !finalExamPassed;
}
async function saveUserData(data) {
  if (currentUser) await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
}
function setView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === `${viewName}-view`));
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function getModuleQuizQuestions(index) {
  const moduleName = modules[index]?.[0] || 'este módulo';
  return [
    {
      question: `Qual é o foco principal deste módulo de ${moduleName.toLowerCase()}?`,
      options: ['Estudar os temas centrais do conteúdo', 'Ignorar a apostila e avançar sem ler', 'Copiar o texto sem refletir', 'Pular diretamente para a prova'],
      answer: 'Estudar os temas centrais do conteúdo'
    },
    {
      question: 'O que ajuda a fixar melhor o conteúdo da apostila?',
      options: ['Registrar ideias, perguntas e aplicações', 'Não fazer nenhuma anotação', 'Fechar o PDF logo no início', 'Ler apenas a capa'],
      answer: 'Registrar ideias, perguntas e aplicações'
    },
    {
      question: 'Para concluir este módulo com segurança, o que é necessário?',
      options: ['Baixar o material e responder a revisão do módulo', 'Apenas abrir o PDF sem ler', 'Ignorar as perguntas e marcar tudo', 'Aguardar alguém marcar por você'],
      answer: 'Baixar o material e responder a revisão do módulo'
    }
  ];
}
function persistQuizState() {
  localStorage.setItem('seminario-module-quiz', JSON.stringify(moduleQuizState));
}
function syncProfileSummary() {
  const name = (profileNameInput && profileNameInput.value.trim()) || currentUser?.displayName || 'Aluno(a)';
  const email = (profileEmailInput && profileEmailInput.value.trim()) || currentUser?.email || 'Sem cadastro';
  const church = (profileChurchInput && profileChurchInput.value.trim()) || churchNameInput?.value.trim() || 'Não informada';
  const phone = (profilePhoneInput && profilePhoneInput.value.trim()) || 'Não informado';
  const course = (profileCourseInput && profileCourseInput.value.trim()) || 'Não informado';

  summaryName.textContent = name;
  summaryEmail.textContent = email;
  summaryChurch.textContent = church;
  summaryPhone.textContent = phone;
  summaryCourse.textContent = course;

  if (summaryAvatar) {
    const seed = (name || 'AT').trim().slice(0, 2).toUpperCase();
    summaryAvatar.textContent = seed;
  }
}
function fillProfileForm(data = {}) {
  const userName = currentUser?.displayName || data.displayName || 'Aluno(a)';
  const userEmail = currentUser?.email || data.email || '';
  const church = data.churchName || churchNameInput?.value.trim() || '';

  if (profileNameInput) profileNameInput.value = data.displayName || userName;
  if (profileEmailInput) profileEmailInput.value = data.email || userEmail || '';
  if (profilePhoneInput) profilePhoneInput.value = data.phone || '';
  if (profileChurchInput) profileChurchInput.value = church;
  if (profileCourseInput) profileCourseInput.value = data.course || '';
  if (profileTermsAcceptedInput) profileTermsAcceptedInput.checked = Boolean(data.termsAccepted ?? true);
  if (termsAcceptedInput) termsAcceptedInput.checked = profileTermsAcceptedInput.checked;
  if (churchNameInput) churchNameInput.value = church;
  syncProfileSummary();
}
function goToModule(slug) {
  const index = modules.findIndex((item) => item[2] === slug);
  if (index < 0) return;
  const [title, description, , category] = modules[index];
  const quizQuestions = getModuleQuizQuestions(index);
  const savedState = getModuleQuizState(index);
  const quizPassed = Boolean(savedState.passed);
  const quizMarkup = quizQuestions.map((question, questionIndex) => `
    <fieldset class="module-quiz-fieldset">
      <legend>${questionIndex + 1}. ${question.question}</legend>
      ${question.options.map((option) => `
        <label>
          <input type="radio" name="module-q-${index}-${questionIndex}" value="${option}" ${savedState.answers[questionIndex] === option ? 'checked' : ''} /> ${option}
        </label>
      `).join('')}
    </fieldset>
  `).join('');

  $('#module-detail-content').innerHTML = `<div class="detail-header"><div><p class="eyebrow accent">MÓDULO ${String(index + 1).padStart(2, '0')} · ${category.toUpperCase()}</p><h1>${title}</h1><p class="detail-description">${description}</p></div><div class="detail-number">${String(index + 1).padStart(2, '0')}</div></div><div class="detail-grid"><article class="lesson-panel"><p class="eyebrow">SOBRE ESTE MÓDULO</p><h2>O que você vai estudar</h2><p>Esta etapa acompanha sua leitura da apostila com mais clareza e constância.</p><ul><li>Leia a apostila e destaque os conceitos principais.</li><li>Registre suas perguntas na área de anotações.</li><li>Retorne para revisar o conteúdo.</li></ul><div class="detail-actions"><button class="primary-button" data-read="${slug}">Abrir apostila PDF <span>↗</span></button></div><form class="module-quiz" data-quiz-index="${index}">${quizMarkup}<div class="quiz-row"><button class="secondary-button" type="submit">Validar 3 questões</button><span class="quiz-result">${quizPassed ? 'Revisão concluída com sucesso.' : 'Baixe a apostila e responda as 3 questões para liberar a conclusão.'}</span></div></form><div class="detail-actions"><button class="complete-button ${completed.has(index) ? 'is-complete' : ''}" data-complete="${index}" ${!quizPassed || completed.has(index) ? 'disabled' : ''}>${completed.has(index) ? '✓ Módulo concluído' : 'Marcar como concluído'}</button></div></article><aside class="detail-aside"><div class="detail-icon">▣</div><strong>Material de estudo</strong><span>Apostila em PDF</span><hr /><div class="aside-stat"><span>Status</span><b>${completed.has(index) ? 'Concluído' : 'Em andamento'}</b></div><div class="aside-stat"><span>Trilha</span><b>${category}</b></div></aside></div>`;
  setView('module-detail');
  window.location.hash = `modulo/${slug}`;
}
async function openModule(slug) {
  const index = modules.findIndex((item) => item[2] === slug);
  if (index < 0) return;
  window.open(moduleFile(slug), '_blank', 'noopener');
}
function showCertificate() {
  $('#certificate-name').textContent = currentUser?.displayName || 'Aluno(a)';
  $('#certificate-church').textContent = churchNameInput.value.trim() || 'Sua igreja';
  $('#certificate-date').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
  setView('certificate');
}
async function loadUserData(user) {
  currentUser = user;
  const googleProfile = {
    displayName: user.displayName || 'Aluno(a)',
    email: user.email || '',
    phone: '',
    churchName: churchNameInput.value.trim(),
    course: '',
    termsAccepted: true
  };

  const profileData = { ...googleProfile, photoURL: user.photoURL || null, termsAcceptedAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() };
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (snapshot.exists()) {
    const data = snapshot.data();
    completed = new Set(data.completed || []);
    finalExamPassed = Boolean(data.finalExamPassed);
    notesInput.value = data.notes || '';
    fillProfileForm({
      displayName: data.displayName || user.displayName || 'Aluno(a)',
      email: data.email || user.email || '',
      phone: data.phone || '',
      churchName: data.churchName || churchNameInput.value.trim(),
      course: data.course || '',
      termsAccepted: Boolean(data.termsAccepted ?? true)
    });
    churchNameInput.value = data.churchName || churchNameInput.value;
  } else {
    fillProfileForm(googleProfile);
    await saveUserData({ ...profileData, completed: [...completed], notes: notesInput.value, createdAt: new Date().toISOString() });
  }
  await saveUserData({ ...profileData, churchName: churchNameInput.value.trim() });
  localStorage.setItem('seminario-completed', JSON.stringify([...completed]));
  localStorage.setItem('seminario-exam-passed', String(finalExamPassed));
  localStorage.setItem('seminario-notes', notesInput.value);
  updateProgress();
  renderModules($('#module-grid'), modules.slice(0, 6));
  renderFilteredModules();
}
async function login() {
  if (!churchNameInput.value.trim()) { authMessage.textContent = 'Informe o nome da igreja antes de entrar.'; churchNameInput.focus(); return; }
  if (!termsAcceptedInput.checked) { authMessage.textContent = 'Leia e aceite o termo para continuar.'; return; }
  authMessage.textContent = 'Abrindo o login seguro do Google...';
  try { await signInWithPopup(auth, googleProvider); } catch (error) { authMessage.textContent = error.code === 'auth/popup-blocked' ? 'O navegador bloqueou a janela. Permita pop-ups e tente novamente.' : 'Não foi possível entrar. Verifique a configuração do Firebase.'; }
}

renderModules($('#module-grid'), modules.slice(0, 6));
renderFilteredModules();
updateProgress();
$('#google-login').addEventListener('click', login);
$('#top-login').addEventListener('click', login);
$('#logout-button').addEventListener('click', () => signOut(auth));
$('#continue-button').addEventListener('click', () => goToModule('introducao-a-teologia'));
$('#certificate-button').addEventListener('click', showCertificate);
$('#exam-button').addEventListener('click', () => setView('exam'));
$('#back-from-certificate').addEventListener('click', () => setView('dashboard'));
$('#back-from-exam').addEventListener('click', () => setView('dashboard'));
$('#print-certificate').addEventListener('click', () => window.print());
$('#terms-button').addEventListener('click', () => $('#terms-dialog').showModal());
$('#profile-terms-button').addEventListener('click', () => $('#terms-dialog').showModal());
$('#close-terms').addEventListener('click', () => $('#terms-dialog').close());
$('#save-profile').addEventListener('click', async () => {
  if (!currentUser) {
    profileFormStatus.textContent = 'Faça login para salvar seus dados pessoais.';
    return;
  }

  const profileData = {
    displayName: profileNameInput.value.trim() || currentUser.displayName || 'Aluno(a)',
    email: profileEmailInput.value.trim() || currentUser.email || '',
    phone: profilePhoneInput.value.trim(),
    churchName: profileChurchInput.value.trim() || churchNameInput.value.trim(),
    course: profileCourseInput.value.trim(),
    termsAccepted: profileTermsAcceptedInput.checked,
    profileUpdatedAt: new Date().toISOString()
  };

  churchNameInput.value = profileData.churchName;
  termsAcceptedInput.checked = profileTermsAcceptedInput.checked;
  localStorage.setItem('seminario-church-name', profileData.churchName);
  localStorage.setItem('seminario-profile', JSON.stringify(profileData));

  await saveUserData(profileData);
  fillProfileForm(profileData);
  profileFormStatus.textContent = 'Dados pessoais salvos com sucesso.';
  authMessage.textContent = 'Perfil atualizado e sincronizado com sua conta.';
});
$('#exam-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const answers = ['a', 'b', 'a', 'a', 'a'];
  const score = answers.reduce((total, answer, index) => total + (new FormData(event.currentTarget).get(`q${index + 1}`) === answer ? 1 : 0), 0);
  const percentage = Math.round((score / answers.length) * 100);
  const passed = percentage >= 70;
  finalExamPassed = passed;
  localStorage.setItem('seminario-exam-passed', String(passed));
  await saveUserData({ finalExamPassed: passed, finalExamScore: percentage, finalExamAt: new Date().toISOString() });
  $('#exam-result').textContent = passed ? `Aprovado com ${percentage}%. Seu certificado foi liberado.` : `Você fez ${percentage}%. É preciso alcançar 70%. Tente novamente.`;
  updateExamAccess();
});
$('#back-to-modules').addEventListener('click', () => setView('modules'));
document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter-button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); activeFilter = button.dataset.filter; renderFilteredModules(); }));
$('#search-input').addEventListener('input', (event) => { searchQuery = event.target.value.toLowerCase().trim(); renderFilteredModules(); });
$('#save-notes').addEventListener('click', (event) => { localStorage.setItem('seminario-notes', notesInput.value); saveUserData({ notes: notesInput.value, updatedAt: new Date().toISOString() }).then(() => { notesStatus.textContent = 'Sincronizado com sua conta'; event.currentTarget.textContent = 'Salvo ✓'; setTimeout(() => { event.currentTarget.textContent = 'Salvar anotações'; }, 1600); }).catch(() => { notesStatus.textContent = 'Salvo neste navegador'; }); });
document.addEventListener('submit', (event) => {
  const form = event.target.closest('.module-quiz');
  if (!form) return;
  event.preventDefault();

  const index = Number(form.dataset.quizIndex);
  const questions = getModuleQuizQuestions(index);
  const answers = {};
  let score = 0;

  questions.forEach((question, questionIndex) => {
    const selected = form.querySelector(`input[name="module-q-${index}-${questionIndex}"]:checked`);
    const value = selected ? selected.value : null;
    answers[questionIndex] = value;
    if (value && value === question.answer) score += 1;
  });

  const passed = score === questions.length;
  const resultText = form.querySelector('.quiz-result');
  const completeButton = document.querySelector(`.complete-button[data-complete="${index}"]`);

  moduleQuizState[index] = { passed, score, answers, answeredAt: new Date().toISOString() };
  persistQuizState();

  resultText.textContent = passed
    ? 'Revisão concluída com sucesso. Agora você pode marcar o módulo como concluído.'
    : 'Ainda não está correto. Revise a apostila e responda as 3 perguntas novamente.';

  if (completeButton) {
    completeButton.disabled = !passed || completed.has(index);
  }
});
document.addEventListener('click', (event) => { const view = event.target.closest('[data-view]'); const module = event.target.closest('[data-open]'); const read = event.target.closest('[data-read]'); const complete = event.target.closest('[data-complete]'); if (view) setView(view.dataset.view); if (module) goToModule(module.dataset.open); if (read) openModule(read.dataset.read); if (complete) {
    const moduleIndex = Number(complete.dataset.complete);
    if (!moduleQuizState[moduleIndex]?.passed) {
      const resultText = document.querySelector(`.quiz-result`);
      if (resultText) resultText.textContent = 'Baixe a apostila e responda as 3 perguntas antes de concluir o módulo.';
      return;
    }
    completed.add(moduleIndex);
    localStorage.setItem('seminario-completed', JSON.stringify([...completed]));
    saveUserData({ completed: [...completed], updatedAt: new Date().toISOString() });
    updateProgress();
    goToModule(modules[moduleIndex][2]);
  } });
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    authGate.classList.remove('hidden');
    $('#top-login').classList.remove('hidden');
    $('#profile').classList.add('hidden');
    return;
  }

  currentUser = user;
  authGate.classList.add('hidden');
  $('#top-login').classList.add('hidden');
  $('#profile').classList.remove('hidden');
  $('#profile-name').textContent = user.displayName || 'Aluno(a)';
  $('#profile-email').textContent = user.email || 'Conta Google';
  $('#profile-avatar').textContent = (user.displayName || user.email || 'AT').slice(0, 2).toUpperCase();

  fillProfileForm({
    displayName: user.displayName || 'Aluno(a)',
    email: user.email || '',
    churchName: churchNameInput?.value.trim() || '',
    termsAccepted: true
  });

  try {
    await loadUserData(user);
  } catch (error) {
    authMessage.textContent = 'Login feito, mas não foi possível carregar o Firestore. Confira as regras do banco.';
  }
});

if (profileNameInput) {
  profileNameInput.addEventListener('input', syncProfileSummary);
  profileEmailInput.addEventListener('input', syncProfileSummary);
  profilePhoneInput.addEventListener('input', syncProfileSummary);
  profileChurchInput.addEventListener('input', syncProfileSummary);
  profileCourseInput.addEventListener('input', syncProfileSummary);
}
