import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Level from '#models/level'
import LevelGeneratorService from '#services/level_generator_service'
import LevelRepository from '#repositories/level_repository'

/*
| Pruebas funcionales: levantan el servidor HTTP y usan una BD MySQL real
| (zip_game_test). Antes de correrlas: crear la BD de pruebas y el .env.test.
*/
async function createLevel(difficulty: 'easy' | 'medium' | 'hard' = 'easy', seed = 11) {
  const generated = new LevelGeneratorService().generate(difficulty, seed, `Test ${difficulty} ${seed}`)
  return new LevelRepository().create(generated)
}

function createUser(username = 'player1') {
  return User.create({
    username,
    email: `${username}@zipgame.test`,
    password: 'secret123',
    recommendedDifficulty: 'easy',
  })
}

test.group('Auth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('registers a player and returns a token', async ({ client, assert }) => {
    const response = await client.post('/api/auth/register').json({
      username: 'new_player',
      email: 'new@zipgame.test',
      password: 'secret123',
    })
    response.assertStatus(201)
    assert.exists(response.body().token.value)
    assert.notProperty(response.body().user, 'password')

    const user = await User.findByOrFail('email', 'new@zipgame.test')
    assert.notEqual(user.password, 'secret123') // guardada como hash
  })

  test('returns 422 for invalid registration data', async ({ client }) => {
    const response = await client.post('/api/auth/register').json({ username: 'a', email: 'bad' })
    response.assertStatus(422)
  })

  test('logs in with valid credentials and rejects bad ones', async ({ client, assert }) => {
    await createUser()
    const ok = await client.post('/api/auth/login').json({ email: 'player1@zipgame.test', password: 'secret123' })
    ok.assertStatus(200)
    assert.exists(ok.body().token.value)

    const bad = await client.post('/api/auth/login').json({ email: 'player1@zipgame.test', password: 'wrong' })
    bad.assertStatus(400)
  })

  test('protected routes require a token', async ({ client }) => {
    const response = await client.get('/api/users/me')
    response.assertStatus(401)
  })
})

test.group('Levels', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists levels without exposing the solution', async ({ client, assert }) => {
    const user = await createUser()
    await createLevel('easy')
    const response = await client.get('/api/levels').loginAs(user)
    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.notProperty(response.body().data[0], 'solution')
    assert.property(response.body().data[0], 'checkpoints')
  })

  test('returns 404 for a missing level', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/api/levels/9999').loginAs(user)
    response.assertStatus(404)
  })

  test('generates and stores a new level', async ({ client, assert }) => {
    const user = await createUser()
    const response = await client.post('/api/levels/generate').json({ difficulty: 'hard' }).loginAs(user)
    response.assertStatus(201)
    assert.equal(await Level.query().count('* as total').first().then((r) => Number(r!.$extras.total)), 1)
  })
})

test.group('Games', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('full flow: start, hint, finish with a valid solution', async ({ client, assert }) => {
    const user = await createUser()
    const level = await createLevel('easy')

    const start = await client.post('/api/games').json({ level_id: level.id }).loginAs(user)
    start.assertStatus(201)
    const sessionId = start.body().session.id

    const hint = await client
      .post(`/api/games/${sessionId}/hint`)
      .json({ path: level.solution.slice(0, 3) })
      .loginAs(user)
    hint.assertStatus(200)
    assert.equal(hint.body().hint.next_cell, level.solution[3])

    const finish = await client
      .post(`/api/games/${sessionId}/finish`)
      .json({
        path: level.solution,
        moves: level.solution.map((cell) => ({ type: 'add', cell })).concat([{ type: 'invalid', cell: 0 }]),
      })
      .loginAs(user)
    finish.assertStatus(200)
    assert.equal(finish.body().session.status, 'completed')
    assert.equal(finish.body().score.mistakes, 1)
    assert.equal(finish.body().score.hints_used, 1)
    assert.isAbove(finish.body().score.points, 0)

    // Persistencia en MySQL
    const moves = await db.from('game_moves').where('game_session_id', sessionId).count('* as total')
    assert.equal(Number(moves[0].total), 37)
    const scores = await db.from('scores').where('game_session_id', sessionId)
    assert.lengthOf(scores, 1)
  })

  test('rejects an invalid solution with 422', async ({ client, assert }) => {
    const user = await createUser()
    const level = await createLevel('easy')
    const start = await client.post('/api/games').json({ level_id: level.id }).loginAs(user)
    const sessionId = start.body().session.id

    const repeated = [...level.solution.slice(0, 35), level.solution[0]]
    const response = await client.post(`/api/games/${sessionId}/finish`).json({ path: repeated }).loginAs(user)
    response.assertStatus(422)
    assert.equal(response.body().code, 'E_REPEATED_CELL')

    const incomplete = await client
      .post(`/api/games/${sessionId}/finish`)
      .json({ path: level.solution.slice(0, 10) })
      .loginAs(user)
    incomplete.assertStatus(422)
    assert.equal(incomplete.body().code, 'E_INCOMPLETE')
  })

  test('prevents finishing the same game twice', async ({ client }) => {
    const user = await createUser()
    const level = await createLevel('easy')
    const start = await client.post('/api/games').json({ level_id: level.id }).loginAs(user)
    const sessionId = start.body().session.id

    const first = await client.post(`/api/games/${sessionId}/finish`).json({ path: level.solution }).loginAs(user)
    first.assertStatus(200)
    const second = await client.post(`/api/games/${sessionId}/finish`).json({ path: level.solution }).loginAs(user)
    second.assertStatus(409)
  })

  test('a player cannot finish another player game', async ({ client }) => {
    const owner = await createUser('owner')
    const intruder = await createUser('intruder')
    const level = await createLevel('easy')
    const start = await client.post('/api/games').json({ level_id: level.id }).loginAs(owner)

    const response = await client
      .post(`/api/games/${start.body().session.id}/finish`)
      .json({ path: level.solution })
      .loginAs(intruder)
    response.assertStatus(404)
  })

  test('history and leaderboard reflect persisted results', async ({ client, assert }) => {
    const user = await createUser()
    const level = await createLevel('easy')
    const start = await client.post('/api/games').json({ level_id: level.id }).loginAs(user)
    await client.post(`/api/games/${start.body().session.id}/finish`).json({ path: level.solution }).loginAs(user)

    const history = await client.get('/api/games/history').loginAs(user)
    history.assertStatus(200)
    assert.lengthOf(history.body().data, 1)

    const leaderboard = await client.get('/api/leaderboard')
    leaderboard.assertStatus(200)
    assert.equal(leaderboard.body().data[0].username, 'player1')
    assert.equal(leaderboard.body().data[0].levels_completed, 1)

    const me = await client.get('/api/users/me').loginAs(user)
    me.assertStatus(200)
    assert.equal(me.body().stats.levels_completed, 1)
  })
})
