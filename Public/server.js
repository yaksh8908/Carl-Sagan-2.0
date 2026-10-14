
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// ============================================================
// BANCO DE DADOS EM MEMÓRIA
// ============================================================

const users = [];


// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get('/', (req, res) => {
    return res.json(users);
});


// ============================================================
// ROTA DE CADASTRO
// ============================================================

app.post('/cadastro', (req, res) => {
    const { usuario, email, senha } = req.body;

    if (!usuario || !email || !senha) {
        return res.status(400).json({
            erro: "Preencha todos os campos"
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            erro: "A senha deve ter pelo menos 6 caracteres"
        });
    }

    const emailExistente = users.find((u) => u.email === email);

    if (emailExistente) {
        return res.status(409).json({
            erro: "E-mail já cadastrado"
        });
    }

    users.push({
        usuario,
        email,
        senha
    });

    console.log(
        `[CADASTRO SUCESSO] Usuário: ${usuario} (${email})`
    );

    return res.json({
        mensagem: "Cadastro realizado com sucesso!",
        redirecionar: "login.html"
    });
});


// ============================================================
// ROTA DE LOGIN
// ============================================================

app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: "Preencha todos os campos"
        });
    }

    const usuarioValido = users.find(
        (u) => u.email === email && u.senha === senha
    );

    if (usuarioValido) {

        console.log(
            `[LOGIN SUCESSO] Usuário: ${usuarioValido.usuario}`
        );

        return res.json({
            mensagem: "Login realizado com sucesso!",
            redirecionar: "chat.html"
        });

    } else {

        return res.status(401).json({
            erro: "E-mail ou senha incorretos"
        });
    }
});


// ============================================================
// CHATBOT — GROQ
// ============================================================

app.post('/api/chat', async (req, res) => {

    try {

        const { messages } = req.body;

        // Verifica se recebeu mensagens
        if (!Array.isArray(messages)) {

            return res.status(400).json({
                erro: "Mensagens inválidas."
            });

        }

        // Verifica se a API Key existe
        if (!process.env.GROQ_API_KEY) {

            console.error(
                "GROQ_API_KEY não encontrada no arquivo .env"
            );

            return res.status(500).json({
                erro: "A chave da Groq não foi configurada no servidor."
            });

        }

        // Envia a conversa para a Groq
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },

                body: JSON.stringify({

                    model: "openai/gpt-oss-20b",

                    messages: messages,

                    temperature: 0.7,

                    max_completion_tokens: 500

                })
            }
        );

        const data = await response.json();

        // Se a Groq retornar erro
        if (!response.ok) {

            console.error(
                "[ERRO GROQ]",
                data
            );

            return res.status(response.status).json({
                erro:
                    data?.error?.message ||
                    "Erro ao consultar a Groq."
            });
        }

        // Pega a resposta da IA
        const answer =
            data?.choices?.[0]?.message?.content;

        if (!answer) {

            return res.status(500).json({
                erro: "A Groq não retornou uma resposta."
            });
        }

        console.log("[GROQ] Resposta enviada com sucesso.");

        return res.json({
            answer: answer.trim()
        });

    } catch (error) {

        console.error(
            "[ERRO SERVIDOR/GROQ]",
            error
        );

        return res.status(500).json({
            erro: "Erro interno ao consultar a inteligência artificial."
        });
    }
});


// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {

    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

});

