require('dotenv').config();
const { getPool } = require('./pool');

function toDateTime(dateStr, timeRange) {
  // dateStr: '2025-10-15', timeRange: '9:00 AM - 9:30 AM'
  const [startStr, endStr] = timeRange.split(' - ').map(s => s.trim());
  const start = new Date(`${dateStr} ${startStr}`);
  const end = new Date(`${dateStr} ${endStr}`);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { start: fmt(start), end: fmt(end) };
}

async function seed() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    console.log('Seeding database with sample data...');
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    const tables = [
      'consultation_guidelines',
      'consultations',
      'advisor_availability',
      'advisor_modes',
      'advisor_guidelines',
      'advisor_topics',
      'advisor_courses',
      'advisor_profiles',
      'student_profiles',
      'users',
    ];
    for (const t of tables) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1');

    // Insert users
    const users = [
      { role: 'student', email: 'juan@example.com', full_name: 'Juan Dela Cruz' },
      { role: 'student', email: 'sara@example.com', full_name: 'Sara Lee' },
      { role: 'student', email: 'mike@example.com', full_name: 'Mike Johnson' },
      { role: 'advisor', email: 'maria.santos@example.com', full_name: 'Dr. Maria Santos' },
      { role: 'advisor', email: 'jennifer.lee@example.com', full_name: 'Dr. Jennifer Lee' },
      { role: 'advisor', email: 'david.kim@example.com', full_name: 'Prof. David Kim' },
      { role: 'advisor', email: 'emily.wang@example.com', full_name: 'Dr. Emily Wang' },
      { role: 'advisor', email: 'chris.green@example.com', full_name: 'Prof. Chris Green' },
    ];
    const userIds = {};
    for (const u of users) {
      const [res] = await conn.query(
        'INSERT INTO users (role, email, full_name, status) VALUES (?,?,?,?)',
        [u.role, u.email, u.full_name, 'active']
      );
      userIds[u.email] = res.insertId;
    }

    // Student profiles
    await conn.query(
      'INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)',
      [userIds['juan@example.com'], 'BS Computer Science', '3']
    );
    await conn.query(
      'INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)',
      [userIds['sara@example.com'], 'BA Psychology', '2']
    );
    await conn.query(
      'INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)',
      [userIds['mike@example.com'], 'BSc Mathematics', '4']
    );

    // Advisor profiles
    const advisorProfiles = [
      {
        email: 'maria.santos@example.com',
        title: 'Professor of Computer Science',
        department: 'Computer Science',
        bio: 'Specializes in AI and ML with 15+ years experience.',
        status: 'available',
      },
      {
        email: 'jennifer.lee@example.com',
        title: 'Professor of Psychology',
        department: 'Psychology',
        bio: 'Focus on cognitive psychology and student mentorship.',
        status: 'available',
      },
      {
      email: 'david.kim@example.com',
        title: 'Associate Professor of Statistics',
        department: 'Statistics',
        bio: 'Applied statistics and data analysis in research.',
        status: 'available',
      },
      {
        email: 'emily.wang@example.com',
        title: 'Lecturer in Literature',
        department: 'English',
        bio: 'Expert in modern literature and creative writing.',
        status: 'available',
      },
      {
        email: 'chris.green@example.com',
        title: 'Senior Lecturer in Environmental Science',
        department: 'Environmental Science',
        bio: 'Research focus on climate change and sustainable development.',
        status: 'available',
      },
    ];
    for (const ap of advisorProfiles) {
      const advisorId = userIds[ap.email];
      await conn.query(
        'INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)',
        [advisorId, ap.title, ap.department, ap.bio, ap.status]
      );
    }

    // Advisor modes
    await conn.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userIds['maria.santos@example.com'], 1, 1]);
    await conn.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userIds['jennifer.lee@example.com'], 1, 1]);
    await conn.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userIds['david.kim@example.com'], 0, 1]);
    await conn.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userIds['emily.wang@example.com'], 1, 0]);
    await conn.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userIds['chris.green@example.com'], 1, 1]);

    // Advisor courses/topics/guidelines
    const insertMany = async (sql, rows) => {
      for (const r of rows) await conn.query(sql, r);
    };

    await insertMany(
      'INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)',
      [
        [userIds['maria.santos@example.com'], 'CS 101', 'CS101', 'Introduction to Computer Science'],
        [userIds['maria.santos@example.com'], 'CS 301', 'CS301', 'Data Structures and Algorithms'],
        [userIds['maria.santos@example.com'], 'CS 401', 'CS401', 'Machine Learning Fundamentals'],
        [userIds['jennifer.lee@example.com'], 'PSY 101', 'PSY101', 'Introduction to Psychology'],
        [userIds['jennifer.lee@example.com'], 'PSY 301', 'PSY301', 'Cognitive Psychology'],
        [userIds['david.kim@example.com'], 'STAT 201', 'STAT201', 'Applied Statistics'],
        [userIds['david.kim@example.com'], 'STAT 301', 'STAT301', 'Statistical Modeling'],
        [userIds['emily.wang@example.com'], 'ENG 101', 'ENG101', 'Introduction to Literature'],
        [userIds['emily.wang@example.com'], 'ENG 305', 'ENG305', 'Creative Writing Workshop'],
        [userIds['chris.green@example.com'], 'ENV 200', 'ENV200', 'Environmental Science Basics'],
        [userIds['chris.green@example.com'], 'ENV 410', 'ENV410', 'Climate Change Policy'],
      ]
    );

    await insertMany(
      'INSERT INTO advisor_topics (advisor_user_id, topic) VALUES (?,?)',
      [
        [userIds['maria.santos@example.com'], 'Thesis Guidance'],
        [userIds['maria.santos@example.com'], 'Programming Projects'],
        [userIds['maria.santos@example.com'], 'Research Methods'],
        [userIds['jennifer.lee@example.com'], 'Career Advice'],
        [userIds['jennifer.lee@example.com'], 'Academic Planning'],
        [userIds['david.kim@example.com'], 'Data Analysis'],
        [userIds['david.kim@example.com'], 'Algorithm Design'],
      ]
    );

    await insertMany(
      'INSERT INTO advisor_guidelines (advisor_user_id, guideline_text) VALUES (?,?)',
      [
        [userIds['maria.santos@example.com'], 'Book at least 2 days in advance'],
        [userIds['maria.santos@example.com'], 'Prepare specific questions beforehand'],
        [userIds['maria.santos@example.com'], 'Bring relevant materials (code, documents)'],
        [userIds['jennifer.lee@example.com'], 'Maximum 1 hour per session'],
        [userIds['jennifer.lee@example.com'], 'Follow up via email if needed'],
        [userIds['david.kim@example.com'], 'Be punctual and prepared'],
      ]
    );

    // Availability
    await insertMany(
      'INSERT INTO advisor_availability (advisor_user_id, day_of_week, start_time, end_time) VALUES (?,?,?,?)',
      [
        [userIds['maria.santos@example.com'], 'monday', '09:00:00', '12:00:00'],
        [userIds['maria.santos@example.com'], 'wednesday', '09:00:00', '12:00:00'],
        [userIds['maria.santos@example.com'], 'friday', '09:00:00', '12:00:00'],
        [userIds['jennifer.lee@example.com'], 'monday', '11:00:00', '15:00:00'],
        [userIds['jennifer.lee@example.com'], 'wednesday', '11:00:00', '15:00:00'],
        [userIds['jennifer.lee@example.com'], 'friday', '11:00:00', '15:00:00'],
        [userIds['david.kim@example.com'], 'tuesday', '10:30:00', '13:00:00'],
        [userIds['david.kim@example.com'], 'thursday', '10:30:00', '13:00:00'],
      ]
    );

    // Consultations for the student
    const c = [];

    // Consultations for Juan Dela Cruz (juan@example.com)
    const juanId = userIds['juan@example.com'];
    c.push({
      studentId: juanId,
      advisorEmail: 'maria.santos@example.com',
      date: '2025-10-15',
      time: '9:00 AM - 9:30 AM',
      topic: 'Data Structures Deep Dive',
      mode: 'online',
      status: 'approved',
      meeting_link: 'https://zoom.us/j/987654321',
      location: null,
    });
    c.push({
      studentId: juanId,
      advisorEmail: 'jennifer.lee@example.com',
      date: '2025-10-18',
      time: '1:00 PM - 1:30 PM',
      topic: 'Internship Application Guidance',
      mode: 'in-person',
      status: 'approved',
      meeting_link: null,
      location: 'Conference Room A, Psychology Building',
    });
    c.push({
      studentId: juanId,
      advisorEmail: 'david.kim@example.com',
      date: '2025-10-20',
      time: '2:30 PM - 3:00 PM',
      topic: 'Graduate School Applications',
      mode: 'online',
      status: 'pending',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      location: null,
    });
    c.push({
      studentId: juanId,
      advisorEmail: 'maria.santos@example.com',
      date: '2024-01-10',
      time: '10:00 AM - 10:30 AM',
      topic: 'Course Registration Issues',
      mode: 'online',
      status: 'completed',
      meeting_link: null,
      location: null,
    });
    c.push({
      studentId: juanId,
      advisorEmail: 'emily.wang@example.com',
      date: '2025-11-01',
      time: '10:00 AM - 10:30 AM',
      topic: 'Literature Review for Thesis',
      mode: 'online',
      status: 'approved',
      meeting_link: 'https://zoom.us/j/1122334455',
      location: null,
    });

    // Consultations for Sara Lee (sara@example.com)
    const saraId = userIds['sara@example.com'];
    c.push({
      studentId: saraId,
      advisorEmail: 'jennifer.lee@example.com',
      date: '2025-10-25',
      time: '11:00 AM - 11:30 AM',
      topic: 'Cognitive Psychology Research',
      mode: 'in-person',
      status: 'approved',
      meeting_link: null,
      location: 'Psychology Lab 203',
    });
    c.push({
      studentId: saraId,
      advisorEmail: 'chris.green@example.com',
      date: '2025-10-28',
      time: '2:00 PM - 2:30 PM',
      topic: 'Environmental Impact of Urbanization',
      mode: 'online',
      status: 'pending',
      meeting_link: 'https://meet.google.com/xyz-uvw-rst',
      location: null,
    });
    c.push({
      studentId: saraId,
      advisorEmail: 'david.kim@example.com',
      date: '2024-02-15',
      time: '9:00 AM - 9:30 AM',
      topic: 'Statistical Analysis for Thesis',
      mode: 'online',
      status: 'completed',
      meeting_link: null,
      location: null,
    });
    c.push({
      studentId: saraId,
      advisorEmail: 'maria.santos@example.com',
      date: '2025-09-01',
      time: '1:00 PM - 1:30 PM',
      topic: 'Missed Consultation - Project Discussion',
      mode: 'online',
      status: 'missed',
      meeting_link: 'https://zoom.us/j/9988776655',
      location: null,
    });

    // Consultations for Mike Johnson (mike@example.com)
    const mikeId = userIds['mike@example.com'];
    c.push({
      studentId: mikeId,
      advisorEmail: 'david.kim@example.com',
      date: '2025-11-05',
      time: '10:00 AM - 10:30 AM',
      topic: 'Advanced Calculus Problems',
      mode: 'in-person',
      status: 'approved',
      meeting_link: null,
      location: 'Math Department Office 101',
    });
    c.push({
      studentId: mikeId,
      advisorEmail: 'maria.santos@example.com',
      date: '2025-11-08',
      time: '3:00 PM - 3:30 PM',
      topic: 'Introduction to AI Ethics',
      mode: 'online',
      status: 'pending',
      meeting_link: 'https://meet.google.com/qwe-rty-uio',
      location: null,
    });
    c.push({
      studentId: mikeId,
      advisorEmail: 'jennifer.lee@example.com',
      date: '2024-03-20',
      time: '11:00 AM - 11:30 AM',
      topic: 'Career Path in Data Science',
      mode: 'online',
      status: 'completed',
      meeting_link: null,
      location: null,
    });
    c.push({
      studentId: mikeId,
      advisorEmail: 'emily.wang@example.com',
      date: '2025-08-10',
      time: '2:00 PM - 2:30 PM',
      topic: 'Cancelled Consultation - Essay Review',
      mode: 'online',
      status: 'cancelled',
      meeting_link: 'https://zoom.us/j/1122334455',
      location: null,
    });

    for (const item of c) {
      const advisorId = userIds[item.advisorEmail];
      const { start, end } = toDateTime(item.date, item.time);
      const [res] = await conn.query(
        'INSERT INTO consultations (student_user_id, advisor_user_id, topic, mode, status, meeting_link, location, start_datetime, end_datetime, duration_minutes) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [
          item.studentId,
          advisorId,
          item.topic,
          item.mode,
          item.status,
          item.meeting_link,
          item.location,
          start,
          end,
          30,
        ]
      );

      // snapshot guidelines (optional)
      await conn.query('INSERT INTO consultation_guidelines (consultation_id, guideline_text) VALUES (?,?)', [res.insertId, 'Arrive 5 minutes early']);
    }

    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();