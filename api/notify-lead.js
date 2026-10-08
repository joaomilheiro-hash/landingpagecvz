export const config = { runtime: 'edge' };

const TO = [
  'brunocamara@cvz-construcoes.pt',
  'joaocamara@cvz-construcoes.pt',
  'joaomilheiro@cvz-construcoes.pt',
  'mab-cm@mabimagination.com',
];

const FROM_CVZ      = 'leads@remodelacoes.cvz-construcoes.pt';
const FROM_PROJETOS = 'leads@brunocamaraarquitectos.com';

const PROJECT_TYPES = {
  'cozinha-casa-banho':  'Cozinha e/ou casa de banho',
  'apartamento-completo':'Apartamento completo',
  'remodelacao-estrutura':'Remodelação com estrutura',
  'preparar-venda':      'Preparar para venda ou arrendamento',
  'licenciamento':       'Licenciamento de obra',
  'regularizacao':       'Regularização',
  'alteracao-uso':       'Alteração de uso',
  'comunicacao-previa':  'Comunicação prévia',
  'outro':               'Outro',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify Supabase webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const record = body.record || body;
  const { name, phone, email, project_type, source, created_at } = record;

  const isProjetos  = source === 'projetos';
  const tipoLabel   = PROJECT_TYPES[project_type] || project_type || '—';
  const sourceLabel = isProjetos ? 'Bruno Câmara Arquitectos — Projetos' : 'CVZ Construções — Remodelação';
  const fromEmail   = isProjetos ? FROM_PROJETOS : FROM_CVZ;
  const headerColor = isProjetos ? '#0D6B38' : '#1E7B50';
  const siteLabel   = isProjetos ? 'projetos.brunocamaraarquitectos.com' : 'remodelacoes.cvz-construcoes.pt';
  const dataHora = created_at
    ? new Date(created_at).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
    : new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

  const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
  <div style="background:${headerColor};padding:20px 28px;border-radius:10px 10px 0 0">
    <p style="margin:0;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6)">Novo lead</p>
    <h1 style="margin:6px 0 0;font-size:1.2rem;color:#fff;font-weight:700">${sourceLabel}</h1>
  </div>
  <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:.9rem">
      <tr><td style="padding:8px 0;color:#666;width:130px">Nome</td><td style="padding:8px 0;font-weight:600">${name || '—'}</td></tr>
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:8px 0;color:#666">Telefone</td><td style="padding:8px 0;font-weight:600">${phone || '—'}</td></tr>
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0">${email || '—'}</td></tr>
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:8px 0;color:#666">Tipo de obra</td><td style="padding:8px 0">${tipoLabel}</td></tr>
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:8px 0;color:#666">Origem</td><td style="padding:8px 0">${sourceLabel}</td></tr>
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:8px 0;color:#666">Data</td><td style="padding:8px 0;color:#888;font-size:.82rem">${dataHora}</td></tr>
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #f0f0f0">
      <a href="https://wa.me/351${(phone || '').replace(/\D/g,'')}" style="display:inline-block;background:#1E7B50;color:#fff;border-radius:100px;padding:10px 20px;font-size:.85rem;font-weight:600;text-decoration:none">Responder pelo WhatsApp</a>
    </div>
    <p style="margin-top:20px;font-size:.75rem;color:#aaa">${siteLabel}</p>
  </div>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: TO,
        subject: `Novo lead — ${name || 'sem nome'} · ${tipoLabel} · ${isProjetos ? 'BCA Projetos' : 'CVZ'}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response('Email failed', { status: 502 });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
