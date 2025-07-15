const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

//GET all students with pagination and marks
app.get('/students', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { marks: true } // 👈 include marks here
      }),
      prisma.student.count()
    ]);

    res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

//GET one student by ID (with marks)
app.get('/students/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { marks: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

//POST create a new student with optional marks
app.post('/students', async (req, res) => {
  const { name, email, age, marks = [] } = req.body;

  try {
    const student = await prisma.student.create({
      data: {
        name,
        email,
        age,
        marks: {
          create: marks.map(m => ({
            subject: m.subject,
            score: m.score
          }))
        }
      },
      include: {
        marks: true
      }
    });

    res.status(201).json(student);
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to create student with marks' });
  }
});

//PUT update student
app.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, age } = req.body;

  try {
    const student = await prisma.student.update({
      where: { id },
      data: { name, email, age }
    });
    res.json(student);
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

//DELETE student and related marks
app.delete('/students/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.mark.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'Student and related marks deleted successfully.' });
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

//POST create a mark for a student
app.post('/marks', async (req, res) => {
  const { studentId, subject, score } = req.body;

  try {
    const mark = await prisma.mark.create({
      data: { studentId, subject, score }
    });
    res.status(201).json(mark);
  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: 'Failed to add mark' });
  }
});

app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
