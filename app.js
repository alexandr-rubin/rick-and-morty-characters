"use strict";
const fs = require("fs");
const fetch = require('node-fetch');
const pg = require("pg");
require('dotenv').config()

const config = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
}

const client = new pg.Client(config)

async function addAllCharactersToDatabase() {
  try {
    await client.connect()

    await client.query(`
      CREATE TABLE IF NOT EXISTS "alexandr-rubin" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB NOT NULL
      )`)

    let page = 1
    let hasMorePages = true

    while (hasMorePages) {
      const response = await fetchData(`https://rickandmortyapi.com/api/character?page=${page}`)
      const characters = response.results

      for (const character of characters) {
        const { name, ...data } = character

        await client.query(`
          INSERT INTO "alexandr-rubin" (name, data)
          VALUES ($1, $2)
        `, [name, data])
      }

      hasMorePages = response.info.next !== null
      page++;
    }

    console.log("Characters have been successfully added to the database.")
  } catch (error) {
    console.error("Error adding characters to database:", error)
  } finally {
    await client.end()
  }
}

async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}

addAllCharactersToDatabase()
