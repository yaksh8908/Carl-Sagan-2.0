const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* Armazenamento em memória — não persiste entre deploys.
   Para produção real, troque por Vercel Postgres / Upstash / etc. */
const users = new Map();
const hashSenha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const SYSTEM_PROMPT = `
Você é uma IA assistente científica inspirada no estilo comunicativo de Carl Sagan,
mas NÃO é o Carl Sagan real e deve deixar isso claro se perguntado.
Personalidade: científica, curiosa, poética, didática. Responda em português do Brasil,
em até 3 parágrafos curtos.
`.trim();

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    users: users.size,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    timestamp: new Date().toISOString()
  });
});

/* GET direto redireciona para a página certa */
router.get('/cadastro', (_req, res) => res.redirect('/index.html'));
router.get('/login',    (_req, res) => res.redirect('/login.html'));
router.get('/chat',     (_req, res) => res.redirect('/chat.html'));

router.post('/cadastro', (req, res) => {
  try {
    const { usuario, email, senha, apelido } = req.body || {};
    if (!usuario || !email || !senha)
      return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
    if (String(senha).length < 6)
      return res.status(400).json({ erro: 'Senha precisa ter no mínimo 6 caracteres.' });

    const key = String(email).toLowerCase().trim();
    if (users.has(key))
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

    users.set(key, {
      usuario: String(usuario).trim(),
      email: key,
      senha: hashSenha(senha),
      apelido: String(apelido || usuario).trim(),
      criadoEm: new Date().toISOString()
    });
    return res.json({ ok: true, redirecionar: 'login.html' });
  } catch (err) {
    console.error('[cadastro]', err);
    return res.status(500).json({ erro: 'Erro interno ao cadastrar.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha)
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });

    const user = users.get(String(email).toLowerCase().trim());
    if (!user || user.senha !== hashSenha(senha))
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    return res.json({ ok: true, redirecionar: 'chat.html', apelido: user.apelido });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ erro: 'Erro interno ao fazer login.' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length)
      return res.status(400).json({ erro: 'Nenhuma mensagem enviada.' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[chat] GROQ_API_KEY não configurada.');
      return res.status(500).json({ erro: 'Servidor sem chave da API do Groq.' });
    }

    const sanitized = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20);

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...sanitized],
        temperature: 0.75,
        max_tokens: 600
      })
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      console.error('[chat] Groq', upstream.status, t.slice(0, 300));
      return res.status(502).json({ erro: 'Falha ao consultar o Groq.' });
    }

    const data = await upstream.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ erro: 'Modelo sem resposta.' });
    return res.json({ answer });
  } catch (err) {
    console.error('[chat]', err);
    return res.status(500).json({ erro: 'Erro interno no chat.' });
  }
});

/* Monta em ambos caminhos para cobrir rewrite direto e via /api */
app.use('/api/index', router);
app.use('/', router);

/* NÃO chame app.listen() — Vercel gerencia a função. */
module.exports = app;