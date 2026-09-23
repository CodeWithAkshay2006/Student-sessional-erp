/**
 * @file seed.js
 * @description Seeds standard subject, academic session, resource links,
 * and realistic student evaluation cohort for demonstration and verification.
 */

import prisma from './client.js';
import {
  computeBest,
  computePercentage,
  classify,
  getClassificationLabel,
  computeSessionalTotal
} from '../domain/calculations.js';

async function seed() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.generatedLetter.deleteMany({});
  await prisma.resourceLink.deleteMany({});
  await prisma.computedResult.deleteMany({});
  await prisma.markEntry.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.subject.deleteMany({});

  // 1. Create Subjects
  const cse101 = await prisma.subject.create({
    data: {
      code: 'CSE101',
      name: 'Data Structures & Algorithms',
      department: 'Computer Science & Engineering'
    }
  });

  const cse102 = await prisma.subject.create({
    data: {
      code: 'CSE102',
      name: 'Database Management Systems',
      department: 'Computer Science & Engineering'
    }
  });

  const cse201 = await prisma.subject.create({
    data: {
      code: 'CSE201',
      name: 'Operating Systems',
      department: 'Computer Science & Engineering'
    }
  });

  console.log('✅ Created subjects: CSE101, CSE102, CSE201');

  // 2. Create Primary Session for CSE101
  const session = await prisma.session.create({
    data: {
      subjectId: cse101.id,
      academicYear: '2025-26',
      term: 'ODD',
      semester: 5,
      section: 'A',
      facultyName: 'Prof. Akshay Saraswat',
      maxT1: 20,
      maxT2: 20,
      maxQuiz: 20,
      maxIE: 5,
      maxTA: 5,
      slowCutoffPct: 50,
      fastCutoffPct: 75,
      totalFormula: 'BEST_PLUS_IE_PLUS_TA'
    }
  });

  console.log(`✅ Created session: ${session.id} (CSE101 2025-26 Sem 5 Sec A)`);

  // 3. Seed Resource Links
  const resources = [
    {
      sessionId: session.id,
      category: 'FAST',
      label: 'Advanced Algorithms & LeetCode Hard',
      url: 'https://leetcode.com/problemset/all/?difficulty=HARD',
      description: 'Competitive programming modules and complex dynamic programming challenges.'
    },
    {
      sessionId: session.id,
      category: 'FAST',
      label: 'Research Mentorship & Graph Systems',
      url: 'https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/',
      description: 'MIT OpenCourseWare advanced algorithm design notes and peer mentorship syllabus.'
    },
    {
      sessionId: session.id,
      category: 'FAST',
      label: 'Competitive Programming Specialization',
      url: 'https://codeforces.com/edu/courses',
      description: 'Binary lifting, segment trees, and graph flow implementations.'
    },
    {
      sessionId: session.id,
      category: 'SLOW',
      label: 'Remedial Module: Arrays, Linked Lists & Pointers',
      url: 'https://www.geeksforgeeks.org/data-structures/',
      description: 'Interactive stepping through memory allocation, pointer arithmetic, and linear traversal.'
    },
    {
      sessionId: session.id,
      category: 'SLOW',
      label: 'VisuAlgo: Interactive Data Structure Visualizer',
      url: 'https://visualgo.net/en',
      description: 'Visual step-by-step animations of stack, queue, and recursion execution stacks.'
    },
    {
      sessionId: session.id,
      category: 'SLOW',
      label: 'Peer Tutoring & Remedial Problem Sets',
      url: 'https://classroom.google.com/c/sessional-remedial-cse101',
      description: 'Weekly supervised problem-solving clinic every Tuesday and Thursday at 4 PM.'
    }
  ];

  for (const res of resources) {
    await prisma.resourceLink.create({ data: res });
  }
  console.log(`✅ Seeded ${resources.length} resource links`);

  // 4. Seed 15 Realistic Students with Marks (IE & TA out of 5, Sessional out of 30)
  const studentData = [
    { rollNo: '23001', name: 'Rahul Sharma', t1: '16.0', t2: '18.0', quizAvg: '17.0', ie: '4.5', ta: '4.5' },
    { rollNo: '23002', name: 'Aman Verma', t1: '12.0', t2: '14.0', quizAvg: '13.0', ie: '4.0', ta: '4.0' },
    { rollNo: '23003', name: 'Priya Singh', t1: '8.0', t2: '10.0', quizAvg: '9.0', ie: '3.5', ta: '3.5' },
    { rollNo: '23004', name: 'Kavita Patel', t1: '7.0', t2: '9.0', quizAvg: '8.0', ie: '3.0', ta: '3.0' },
    { rollNo: '23005', name: 'Neha Gupta', t1: '19.0', t2: '18.5', quizAvg: '19.0', ie: '5.0', ta: '5.0' },
    { rollNo: '23006', name: 'Rohan Joshi', t1: '11.0', t2: '13.0', quizAvg: '12.0', ie: '3.8', ta: '4.0' },
    { rollNo: '23007', name: 'Sneha Reddy', t1: '16.5', t2: '15.0', quizAvg: '16.0', ie: '4.2', ta: '4.5' },
    { rollNo: '23008', name: 'Vikas Kumar', t1: '5.0', t2: '8.0', quizAvg: '6.0', ie: '2.5', ta: '3.0' },
    { rollNo: '23009', name: 'Ananya Roy', t1: '14.0', t2: '13.5', quizAvg: '14.0', ie: '4.0', ta: '4.2' },
    { rollNo: '23010', name: 'Deepak Rao', t1: '9.0', t2: '9.5', quizAvg: '8.5', ie: '3.2', ta: '3.5' },
    { rollNo: '23011', name: 'Aditya Roy', t1: '17.0', t2: '16.5', quizAvg: '17.0', ie: '4.5', ta: '4.5' },
    { rollNo: '23012', name: 'Pooja Nair', t1: 'A', t2: '14.0', quizAvg: '13.0', ie: '4.0', ta: '3.8' },
    { rollNo: '23013', name: 'Suresh Menon', t1: '6.0', t2: 'A', quizAvg: '7.0', ie: '2.8', ta: '3.0' },
    { rollNo: '23014', name: 'Tanvi Shah', t1: '18.0', t2: '18.0', quizAvg: '17.5', ie: '4.8', ta: '4.8' },
    { rollNo: '23015', name: 'Karan Mehra', t1: 'A', t2: 'A', quizAvg: 'A', ie: '2.0', ta: '2.5' }
  ];

  for (const s of studentData) {
    const student = await prisma.student.create({
      data: {
        sessionId: session.id,
        rollNo: s.rollNo,
        name: s.name
      }
    });

    await prisma.markEntry.create({
      data: {
        studentId: student.id,
        sessionId: session.id,
        t1: s.t1,
        t2: s.t2,
        quizAvg: s.quizAvg,
        ieScore: s.ie,
        taScore: s.ta
      }
    });

    const bestScore = computeBest(s.t1, s.t2, s.quizAvg);
    const bestPct = computePercentage(bestScore, session.maxT1);
    const classificationCode = classify(bestPct, session.slowCutoffPct, session.fastCutoffPct);
    const classification = getClassificationLabel(classificationCode);
    const sessionalTotal = computeSessionalTotal({
      bestScore,
      t1: s.t1,
      t2: s.t2,
      quizAvg: s.quizAvg,
      ieScore: s.ie,
      taScore: s.ta
    }, session.totalFormula, session);

    const isAbsent = (s.t1 === 'A' && s.t2 === 'A' && s.quizAvg === 'A');

    await prisma.computedResult.create({
      data: {
        studentId: student.id,
        sessionId: session.id,
        bestScore,
        bestPct,
        classification,
        sessionalTotal,
        isAbsent
      }
    });
  }

  console.log(`✅ Seeded ${studentData.length} students with mark entries and computed results`);
  console.log('🎉 Database seeding completed successfully!');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
