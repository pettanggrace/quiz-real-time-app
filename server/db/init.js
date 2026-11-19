const pool = require('./index');
const fs = require('fs');
const path = require('path');
const { seedQuestions } = require('../services/questionService');

async function initDatabase() {
  try {
    console.log('Initialisation de la base de données...');

    // Supprimer les tables existantes (dans l'ordre pour respecter les foreign keys)
    await pool.query('DROP TABLE IF EXISTS players CASCADE');
    await pool.query('DROP TABLE IF EXISTS rooms CASCADE');
    await pool.query('DROP TABLE IF EXISTS scores CASCADE');
    await pool.query('DROP TABLE IF EXISTS questions CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('Tables existantes supprimées');

    // Lire et exécuter le schéma
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Schéma de la base de données créé avec succès');

    // Vérifier si des questions existent déjà
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM questions');
    if (parseInt(rows[0].count) === 0) {
      console.log('Aucune question trouvée, insertion des questions par défaut...');
      await seedQuestions();
    } else {
      console.log(`${rows[0].count} questions existent déjà dans la base de données`);
    }

    console.log('Base de données initialisée avec succès (tables: users, questions, scores, rooms, players)');

    console.log('Initialisation terminée');
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de l\'initialisation:', err);
    process.exit(1);
  }
}

initDatabase();
