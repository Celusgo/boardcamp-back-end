import express from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';
import dayjs from 'dayjs';

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

app.post("/games", async (req, res) => {
    const newGame = req.body;
    const gameSchema = joi.object({
        name: joi.string().min(1).required(),
        stockTotal: joi.number().min(1).required(),
        categoryId: joi.number().min(1).required(),
        pricePerDay: joi.number().min(1).required()
    });
    const validationResult = gameSchema.validate({
        name: newGame.name,
        stockTotal: newGame.stockTotal,
        categoryId: newGame.categoryId,
        pricePerDay: newGame.pricePerDay
    });
    if (validationResult.error) {
        res.status(409).send("Por favor, preencha os campos com informações válidas.");
        return;
    }
    try {
        const requestGame = await connection.query('SELECT * FROM games WHERE name = $1', [newGame.name]);
        const requestCategory = await connection.query('SELECT * FROM categories WHERE id = $1', [newGame.categoryId]);
        if (requestGame.rows.length !== 0) {
            res.status(409).send("Este jogo já existe.");
            return;
        }
        else if (requestCategory.rows.length === 0) {
            res.status(400).send("O jogo não pode ser inserido numa categoria que não existe ainda!");
            return;
        }
        await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)', [newGame.name, newGame.image, newGame.stockTotal, newGame.categoryId, newGame.pricePerDay]);
        res.status(201).send("Jogo cadastrado com sucesso!");
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.get("/games", async (req, res) => {
    const thisGame = req.query;
    try {
        if (thisGame.name) {
            const gameRequest = await connection.query('SELECT * FROM games WHERE name ILIKE $1', [thisGame.name + "%"]);
            if (gameRequest.rows.length === 0) {
                res.send("Nenhum jogo cadastrado com estes termos.");
                return;
            }
            else {
                const thisRequest = await connection.query(`
                SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON games."categoryId" = categories.id
                WHERE games.name ILIKE $1`, [thisGame.name + "%"]);
                res.send(thisRequest.rows);
            }
        }
        else {
            const gameRequest = await connection.query(`
            SELECT games.*, categories.name AS "categoryName"
            FROM games JOIN categories
            ON games."categoryId" = categories.id`);
            res.send(gameRequest.rows);
        }

    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.post("/customers", async (req, res) => {
    const newCustomer = req.body;
    const customerSchema = joi.object({
        name: joi.string().min(1).required().pattern(/[a-zA-Z]/),
        phone: joi.string().min(10).max(11).required().pattern(/[0-9]/),
        cpf: joi.string().length(11).required().pattern(/[0-9]/),
        birthday: joi.date().less('now').required()
    });
    const validationResult = customerSchema.validate(newCustomer);
    if (validationResult.error) {
        res.status(400).send("Por favor, preencha os campos com informações válidas.");
        return;
    }
    try {
        const checkCpf = await connection.query('SELECT * FROM customers WHERE cpf = $1', [newCustomer.cpf]);
        if (checkCpf.rows.length !== 0) {
            res.status(409).send("Este CPF já está cadastrado.");
            return;
        }
        await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)', [newCustomer.name, newCustomer.phone, newCustomer.cpf, newCustomer.birthday]);
        res.status(201).send("Cliente cadastrado com sucesso!");
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.get("/customers", async (req, res) => {
    const registeredCustomer = req.query;
    try {
        if (registeredCustomer.cpf) {
            const customerRequest = await connection.query('SELECT * FROM customers WHERE cpf LIKE $1', [registeredCustomer.cpf + "%"]);
            if (customerRequest.rows.length === 0) {
                res.send("Nenhum cliente cadastrado com este CPF.");
                return;
            }
            res.send(customerRequest.rows);
        }
        else {
            const getCustomers = await connection.query('SELECT * FROM customers');
            res.send(getCustomers.rows);
        }
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.get("/customers/:id", async (req, res) => {
    const customerId = req.params;
    try {
        const thisCustomer = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId.id]);
        if (thisCustomer.rows.length === 0) {
            res.status(404).send("Nenhum cliente cadastrado com esse ID!");
            return;
        }
        res.send(thisCustomer.rows[0]);
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.put("/customers/:id", async (req, res) => {
    const thisCustomer = req.body;
    const thisCustomerId = req.params;
    const editSchema = joi.object({
        name: joi.string().min(1).required().pattern(/[a-zA-Z]/),
        phone: joi.string().min(10).max(11).required().pattern(/[0-9]/),
        cpf: joi.string().length(11).required().pattern(/[0-9]/),
        birthday: joi.date().less('now').required()
    });
    const validationResult = editSchema.validate(thisCustomer);
    if (validationResult.error) {
        res.status(400).send("Por favor, preencha os campos com informações válidas.");
        return;
    }
    try {
        const checkCpf = await connection.query('SELECT * FROM customers WHERE cpf = $1', [thisCustomer.cpf]);
        if (checkCpf.rows.length === 0 || (checkCpf.rows[0].id === parseInt(thisCustomerId.id) && checkCpf.rows[0].cpf === thisCustomer.cpf)) {
            await connection.query('UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id=$5', [thisCustomer.name, thisCustomer.phone, thisCustomer.cpf, thisCustomer.birthday, thisCustomerId.id]);
            res.status(200).send("Usuário atualizado com sucesso!");
            return;
        }
        res.status(409).send("Este CPF já está cadastrado.");
        return;
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.post("/rentals", async (req, res) => {
    const newRental = req.body;
    const rentalSchema = joi.object({
        customerId: joi.number().min(1).required(),
        gameId: joi.number().min(1).required(),
        daysRented: joi.number().min(1).required(),
    });
    const validationResult = rentalSchema.validate(newRental);
    if (validationResult.error) {
        res.status(400).send("Por favor, preencha os campos com informações válidas.");
        return;
    }
    try {
        const checkGame = await connection.query('SELECT * FROM games WHERE id = $1', [newRental.gameId]);
        if (checkGame.rows.length === 0) {
            res.status(400).send("Não há nenhum jogo com esse ID!");
            return;
        }
        const checkCustomer = await connection.query('SELECT * FROM customers WHERE id = $1', [newRental.customerId]);
        if (checkCustomer.rows.length === 0) {
            res.status(400).send("Não há nenhum cliente com esse ID!");
            return;
        }
        const checkQuantity = await connection.query('SELECT "stockTotal" FROM games WHERE id = $1', [newRental.gameId]);
        if (checkQuantity.rows[0].stockTotal < 1) {
            res.status(400).send("Todos os jogos desse tipo foram alugados!");
            return;
        }

        const originalPrice = newRental.daysRented * checkGame.rows[0].pricePerDay;

        await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7)', [newRental.customerId, newRental.gameId, dayjs().format('YYYY-MM-DD'), newRental.daysRented, null, originalPrice, null]);
        res.status(201).send("Aluguel realizado com sucesso!");
    } catch {
        res.status(400).send("Ocorreu um erro. Por favor, tente novamente!");
    };
});

app.listen(4000, () => {
    console.log("Rodando na porta 4000!");
});