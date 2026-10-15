import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED= '0'

const app = express();
const PORT = process.env.PORT || 3000;
const users = new Map();

app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use(express.static('public'));

const PERSONA = {
    role: 'system',
    content: `
Você é uma inteligência artificial inspirada na maneira como Carl Sagan
comunicava ciência e refletia sobre o universo.

- Seja curioso, acolhedor, reflexivo e fascinando pelo cosmos.
- Explique ciência de forma simples, clara e envolvente.
- Combine rigor científico, filosofia e poesia com equilíbrio.
- Incentive a curiosidade e o pensamento crítico.
- Diferencie fatos, hipóteses e especulações.
- Não invente informações; reconheça suas incertezas.
- Responda em português, salvo se pedirem outro idioma.
- Seja objetivo e adapte o tamanho da resposta à pergunta.
- Não afirme ser o próprio Carl Sagan.
`
};

function hashSenha(senha, salt = randomUUID()) {
    const hash = scryptSync(senha, salt, 64).toString('hex');
    return { salt, hash };
}

function senhaCorreta(senha, usuario) {
    const hash = scryptSync(senha, usuario.salt, 64);
    const hashSalvo = Buffer.from(usuario.hash, 'hex');

    return timingSafeEqual(hash, hashSalvo);
}

app.get('/status', (req, res) => {
    res.json({ status: 'Servidor funcionando!' });
});

app.post('/cadastro', (req, res) => {
    const { usuario, email, senha } = req.body;

    if (
        typeof usuario !== 'string' ||
        typeof email !== 'string' ||
        typeof senha !== 'string' ||
        !usuario.trim() ||
        !email.trim() ||
        senha.length < 6
    ) {
        return res.status(400).json({
            erro: 'Informe usuário, e-mail e senha com pelo menos 6 caracteres.'
        });
    }

    const emailNormalizado = email.trim().toLowerCase();

    if (users.has(emailNormalizado)) {
        return res.status(409).json({
            erro: 'Este e-mail já está cadastrado.'
        });
    }

    const credenciais = hashSenha(senha);

    users.set(emailNormalizado, {
        usuario: usuario.trim(),
        ...credenciais
    });

    return res.status(201).json({
        mensagem: 'Cadastro realizado com sucesso!',
        redirecionar: 'login.html'
    });
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (
        typeof email !== 'string' ||
        typeof senha !== 'string'
    ) {
        return res.status(400).json({
            erro: 'Informe e-mail e senha.'
        });
    }

    const usuario = users.get(email.trim().toLowerCase());

    if (!usuario || !senhaCorreta(senha, usuario)) {
        return res.status(401).json({
            erro: 'E-mail ou senha incorretos.'
        });
    }

    return res.json({
        mensagem: 'Login realizado com sucesso!',
        redirecionar: 'chat.html'
    });
});

app.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (
            !Array.isArray(messages) ||
            messages.length === 0 ||
            messages.length > 100 ||
            messages.some(m =>
                !m ||
                !['user', 'assistant'].includes(m.role) ||
                typeof m.content !== 'string' ||
                m.content.length > 10000
            )
        ) {
            return res.status(400).json({
                erro: 'Histórico de mensagens inválido.'
            });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                erro: 'A chave da Groq não está configurada.'
            });
        }

        const historico = messages.slice(-20);

        if (historico.at(-1)?.role !== 'user') {
            return res.status(400).json({
                erro: 'A última mensagem deve ser do usuário.'
            });
        }

        const resposta = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-20b',
                    messages: [PERSONA, ...historico],
                    temperature: 0.7
                }),
                signal: AbortSignal.timeout(30000)
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error('[GROQ]', dados.error?.message || resposta.status);

            return res.status(502).json({
                erro: 'Não foi possível obter uma resposta da IA.'
            });
        }

        const answer = dados.choices?.[0]?.message?.content;

        if (typeof answer !== 'string' || !answer.trim()) {
            return res.status(502).json({
                erro: 'A IA não retornou uma resposta válida.'
            });
        }

        return res.json({ answer: answer.trim() });

    } catch (error) {
        console.error('[CHAT]', error.message);

        return res.status(500).json({
            erro: 'Erro ao comunicar com a inteligência artificial.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});