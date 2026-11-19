/* ==========================================================================
   COSMOS — server.js
   Backend Express compatível com execução local E Vercel Serverless.

   Local:   node server.js  → http://localhost:3000
   Vercel:  vercel.json aponta para este arquivo como função.

   Requer:
     - Node 18+
     - npm install express
     - Variável de ambiente GROQ_API_KEY (no .env local ou no painel do Vercel)
   ========================================================================== */

   'use strict';

   const express = require('express');
   const path = require('path');
   const crypto = require('crypto');
   
   const app = express();
   
   /* -------------------------------------------------------------------------- */
   /* Middlewares básicos                                                        */
   /* -------------------------------------------------------------------------- */
   app.use(express.json({ limit: '1mb' }));
   app.use(express.urlencoded({ extended: true }));
   
   // CORS simples — útil em desenvolvimento; em produção mesmo-domínio não atrapalha
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
     if (req.method === 'OPTIONS') return res.sendStatus(200);
     next();
   });
   
   /* -------------------------------------------------------------------------- */
   /* Arquivos estáticos (HTML, CSS, JS, imagens) da pasta public/               */
   /* -------------------------------------------------------------------------- */
   const PUBLIC_DIR = path.join(__dirname, 'public');
   app.use(express.static(PUBLIC_DIR));
   
   // Garante que "/" sempre entrega o index.html
   app.get('/', (req, res) => {
     res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
   });
   
   /* -------------------------------------------------------------------------- */
   /* Armazenamento em memória                                                   */
   /* ATENÇÃO: não persiste entre deploys nem entre instâncias do Vercel.        */
   /* Para produção real, troque por Vercel Postgres, Upstash Redis ou similar.  */
   /* -------------------------------------------------------------------------- */
   const users = new Map();
   
   const hashSenha = (senha) =>
     crypto.createHash('sha256').update(String(senha)).digest('hex');
   
   /* -------------------------------------------------------------------------- */
   /* Prompt do assistente                                                       */
   /* -------------------------------------------------------------------------- */
   const SYSTEM_PROMPT = `
   Você é uma IA assistente científica inspirada no estilo comunicativo do
   astrônomo e divulgador científico Carl Sagan — mas você NÃO é o Carl Sagan
   real e deve deixar isso claro se for perguntado.
   
   Sua personalidade é: científica, curiosa, poética, inspiradora, didática e
   respeitosa. Explique ciência de forma acessível e, quando fizer sentido, use
   metáforas relacionadas ao universo.
   
   Responda SEMPRE em português do Brasil, em no máximo 3 parágrafos curtos.
   `.trim();
   
   /* -------------------------------------------------------------------------- */
   /* Health check                                                               */
   /* -------------------------------------------------------------------------- */
   app.get('/health', (req, res) => {
     res.json({
       ok: true,
       users: users.size,
       groqConfigured: Boolean(process.env.GROQ_API_KEY),
       timestamp: new Date().toISOString()
     });
   });
   
   /* -------------------------------------------------------------------------- */
   /* Cadastro                                                                   */
   /* -------------------------------------------------------------------------- */
   app.post('/cadastro', (req, res) => {
     try {
       const { usuario, email, senha, apelido } = req.body || {};
   
       if (!usuario || !email || !senha) {
         return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
       }
   
       if (String(senha).length < 6) {
         return res
           .status(400)
           .json({ erro: 'A senha precisa ter no mínimo 6 caracteres.' });
       }
   
       const key = String(email).toLowerCase().trim();
   
       if (users.has(key)) {
         return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
       }
   
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
   
   /* -------------------------------------------------------------------------- */
   /* Login                                                                      */
   /* -------------------------------------------------------------------------- */
   app.post('/login', (req, res) => {
     try {
       const { email, senha } = req.body || {};
   
       if (!email || !senha) {
         return res.status(400).json({ erro: 'Informe e-mail e senha.' });
       }
   
       const key = String(email).toLowerCase().trim();
       const user = users.get(key);
   
       if (!user || user.senha !== hashSenha(senha)) {
         return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
       }
   
       return res.json({
         ok: true,
         redirecionar: 'chat.html',
         apelido: user.apelido
       });
     } catch (err) {
       console.error('[login]', err);
       return res.status(500).json({ erro: 'Erro interno ao fazer login.' });
     }
   });
   
   /* -------------------------------------------------------------------------- */
   /* Chat com Groq                                                              */
   /* -------------------------------------------------------------------------- */
   app.post('/chat', async (req, res) => {
     try {
       const { messages } = req.body || {};
   
       if (!Array.isArray(messages) || messages.length === 0) {
         return res.status(400).json({ erro: 'Nenhuma mensagem enviada.' });
       }
   
       const apiKey = process.env.GROQ_API_KEY;
       if (!apiKey) {
         console.error('[chat] GROQ_API_KEY não configurada.');
         return res.status(500).json({
           erro: 'Servidor sem chave da API do Groq configurada.'
         });
       }
   
       // Só aceita roles válidos e limita o histórico para não estourar tokens
       const sanitized = messages
         .filter(
           (m) =>
             m &&
             (m.role === 'user' || m.role === 'assistant') &&
             typeof m.content === 'string' &&
             m.content.trim().length > 0
         )
         .slice(-20);
   
       const payload = {
         model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
         messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...sanitized],
         temperature: 0.75,
         max_tokens: 600
       };
   
       const upstream = await fetch(
         'https://api.groq.com/openai/v1/chat/completions',
         {
           method: 'POST',
           headers: {
             Authorization: `Bearer ${apiKey}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify(payload)
         }
       );
   
       if (!upstream.ok) {
         const errText = await upstream.text();
         console.error(
           '[chat] Groq respondeu',
           upstream.status,
           errText.slice(0, 400)
         );
         return res.status(502).json({
           erro: 'Falha ao consultar o Groq. Verifique a GROQ_API_KEY.'
         });
       }
   
       const data = await upstream.json();
       const answer = data?.choices?.[0]?.message?.content?.trim();
   
       if (!answer) {
         return res.status(502).json({ erro: 'O modelo não retornou resposta.' });
       }
   
       return res.json({ answer });
     } catch (err) {
       console.error('[chat]', err);
       return res.status(500).json({ erro: 'Erro interno no chat.' });
     }
   });
   
   /* -------------------------------------------------------------------------- */
   /* Fallback 404 — depois de todos os estáticos e rotas                        */
   /* -------------------------------------------------------------------------- */
   app.use((req, res) => {
     res.status(404).json({ erro: 'Rota não encontrada.' });
   });
   
   /* -------------------------------------------------------------------------- */
   /* Inicialização local                                                        */
   /* No Vercel, require.main !== module, então app.listen NÃO é chamado.        */
   /* -------------------------------------------------------------------------- */
   if (require.main === module) {
     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => {
       console.log(`✦ COSMOS rodando em http://localhost:${PORT}`);
       console.log(
         `  Groq: ${
           process.env.GROQ_API_KEY ? 'configurado ✓' : 'FALTA a GROQ_API_KEY ✗'
         }`
       );
     });
   }
   
   module.exports = app;