import express from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const user = 'bootcamp_role';
const password = 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp';
const host = 'localhost';
const port = 5432;
const database = 'boardcamp';

const connection = new Pool({
    user,
    password,
    host,
    port,
    database
});

app.post("/categories", async (req, res) => {
    const newCategory = req.body;
    const categorySchema = joi.object({
        name: joi.string().min(1).required(),
    });
    const validationResult = categorySchema.validate(newCategory);
    if (validationResult.error) {
        res.status(409).send("Este nome não é válido.");
        return;
    }
    try {
        const request = await connection.query('SELECT * FROM categories WHERE name = $1', [newCategory.name]);
        if (request.rows.length !== 0) {
            res.status(409).send("Esta categoria já existe.");
            return;
        }
        await connection.query('INSERT INTO categories (name) VALUES ($1)', [newCategory.name]);
        res.status(201).send("Categoria criada com sucesso!");
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.get("/categories", async (req, res) => {
    try {
        const request = await connection.query('SELECT * FROM categories');
        res.send(request.rows);
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.listen(4000, () => {
    console.log("Rodando na porta 4000!");
});