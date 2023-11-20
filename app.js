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
  ssl: {
    rejectUnauthorized: false,
    ca: fs
      .readFileSync(`${process.env.HOME_DIRECTORY}.postgresql/root.crt`)
      .toString(),
  },
}

const client = new pg.Client(config)

async function createAllCharactersDatabase(client) {
  client.connect((error) => {
    if (error) throw error
  })

  let pageNumber = 1
  let hasMorePages = true

  await client.query('BEGIN')
  try {
    await client.query(`
    CREATE TABLE IF NOT EXISTS "${process.env.TABLE_NAME}" (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    )`)

    while (hasMorePages) {
      const response = await fetchData(`https://rickandmortyapi.com/api/character?page=${pageNumber}`)
      const characters = response.results

      await addCharactersToDatabase(characters, client)

      hasMorePages = response.info.next !== null
      pageNumber++
    }

    await client.query('COMMIT')
    console.log("Characters have been successfully added to the database.")
  }
  catch (error) {
    console.log("Error adding characters to the database:", error)
    await client.query('ROLLBACK')
  }
  finally {
    await client.end()
  }
}

async function addCharactersToDatabase(characters, client) {
  await Promise.all(characters.map(character => {
    const { name, ...data } = character
    return client.query(`INSERT INTO "${process.env.TABLE_NAME}" (name, data) VALUES ($1, $2)`, [name, data])
  }))
}

async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}


createAllCharactersDatabase(client)
