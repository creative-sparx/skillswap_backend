import request from 'supertest';
import app from '../server.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

describe('Courses Endpoints', () => {
  let authToken;
  let userId;
  let testUser;

  beforeAll(async () => {
    // Create a test user and get auth token
    testUser = await User.create({
      email: 'coursetest@example.com',
      password: 'hashedpassword',
      firstName: 'Course',
      lastName: 'Tester',
      firebaseUid: 'firebase-course-uid'
    });

    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
    userId = testUser._id;
  });

  beforeEach(async () => {
    // Clean up courses collection before each test
    await Course.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    await Course.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/courses', () => {
    let sampleCourses;

    beforeEach(async () => {
      // Create sample courses for testing
      sampleCourses = await Course.create([
        {
          title: 'Advanced JavaScript',
          description: 'Learn advanced JavaScript concepts',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'Advanced',
          duration: 120,
          price: 99.99,
          tags: ['javascript', 'programming', 'web development'],
          isPublished: true
        },
        {
          title: 'Beginner Python',
          description: 'Introduction to Python programming',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'Beginner',
          duration: 60,
          price: 49.99,
          tags: ['python', 'programming', 'basics'],
          isPublished: true
        },
        {
          title: 'UI/UX Design Fundamentals',
          description: 'Learn the basics of UI/UX design',
          instructor: userId,
          category: 'Design',
          skillLevel: 'Beginner',
          duration: 80,
          price: 79.99,
          tags: ['design', 'ui', 'ux'],
          isPublished: true
        },
        {
          title: 'Draft Course',
          description: 'This course is not published yet',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'Intermediate',
          duration: 90,
          price: 59.99,
          tags: ['draft'],
          isPublished: false
        }
      ]);
    });

    it('should get all published courses', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(3); // Only published courses
      expect(response.body.courses.every(course => course.isPublished)).toBe(true);
      
      // Check if courses are sorted by creation date (newest first)
      const courses = response.body.courses;
      for (let i = 1; i < courses.length; i++) {
        expect(new Date(courses[i-1].createdAt)).toBeInstanceOf(Date);
      }
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get('/api/courses?category=Programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(2);
      expect(response.body.courses.every(course => course.category === 'Programming')).toBe(true);
    });

    it('should filter courses by skill level', async () => {
      const response = await request(app)
        .get('/api/courses?skillLevel=Beginner')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(2);
      expect(response.body.courses.every(course => course.skillLevel === 'Beginner')).toBe(true);
    });

    it('should filter courses by price range', async () => {
      const response = await request(app)
        .get('/api/courses?minPrice=50&maxPrice=80')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].price).toBeGreaterThanOrEqual(50);
      expect(response.body.courses[0].price).toBeLessThanOrEqual(80);
    });

    it('should search courses by title', async () => {
      const response = await request(app)
        .get('/api/courses?search=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toContain('JavaScript');
    });

    it('should search courses by description', async () => {
      const response = await request(app)
        .get('/api/courses?search=Introduction')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].description).toContain('Introduction');
    });

    it('should search courses by tags', async () => {
      const response = await request(app)
        .get('/api/courses?search=design')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].tags).toContain('design');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/courses?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalCourses', 3);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });

    it('should handle page 2 with remaining courses', async () => {
      const response = await request(app)
        .get('/api/courses?page=2&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1); // Only 1 course left on page 2
      expect(response.body.pagination.currentPage).toBe(2);
    });

    it('should return empty array for page beyond available data', async () => {
      const response = await request(app)
        .get('/api/courses?page=10&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(0);
      expect(response.body.pagination.currentPage).toBe(10);
    });

    it('should sort courses by price (ascending)', async () => {
      const response = await request(app)
        .get('/api/courses?sortBy=price&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const courses = response.body.courses;
      
      for (let i = 1; i < courses.length; i++) {
        expect(courses[i].price).toBeGreaterThanOrEqual(courses[i-1].price);
      }
    });

    it('should sort courses by price (descending)', async () => {
      const response = await request(app)
        .get('/api/courses?sortBy=price&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const courses = response.body.courses;
      
      for (let i = 1; i < courses.length; i++) {
        expect(courses[i].price).toBeLessThanOrEqual(courses[i-1].price);
      }
    });

    it('should sort courses by duration', async () => {
      const response = await request(app)
        .get('/api/courses?sortBy=duration&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const courses = response.body.courses;
      
      for (let i = 1; i < courses.length; i++) {
        expect(courses[i].duration).toBeGreaterThanOrEqual(courses[i-1].duration);
      }
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/courses?category=Programming&skillLevel=Beginner&maxPrice=60')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      
      const course = response.body.courses[0];
      expect(course.category).toBe('Programming');
      expect(course.skillLevel).toBe('Beginner');
      expect(course.price).toBeLessThanOrEqual(60);
    });

    it('should return instructor information', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      const course = response.body.courses[0];
      
      expect(course.instructor).toHaveProperty('_id');
      expect(course.instructor).toHaveProperty('firstName');
      expect(course.instructor).toHaveProperty('lastName');
      expect(course.instructor).not.toHaveProperty('password');
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/courses?invalidParam=test&page=abc&limit=xyz')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(3); // Should return all courses
    });

    it('should return courses with proper structure', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      const course = response.body.courses[0];
      
      expect(course).toHaveProperty('_id');
      expect(course).toHaveProperty('title');
      expect(course).toHaveProperty('description');
      expect(course).toHaveProperty('instructor');
      expect(course).toHaveProperty('category');
      expect(course).toHaveProperty('skillLevel');
      expect(course).toHaveProperty('duration');
      expect(course).toHaveProperty('price');
      expect(course).toHaveProperty('tags');
      expect(course).toHaveProperty('isPublished');
      expect(course).toHaveProperty('createdAt');
      expect(course).toHaveProperty('updatedAt');
    });

    it('should handle empty result set', async () => {
      // Clear all courses
      await Course.deleteMany({});

      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(0);
      expect(response.body.pagination.totalCourses).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Course.find to throw an error
      const originalFind = Course.find;
      Course.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get('/api/courses')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('error');

      // Restore original method
      Course.find = originalFind;
    });
  });

  describe('Course Model Validation', () => {
    it('should require title field', async () => {
      try {
        await Course.create({
          description: 'Test description',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'Beginner',
          price: 50
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.title).toBeTruthy();
      }
    });

    it('should require instructor field', async () => {
      try {
        await Course.create({
          title: 'Test Course',
          description: 'Test description',
          category: 'Programming',
          skillLevel: 'Beginner',
          price: 50
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.instructor).toBeTruthy();
      }
    });

    it('should validate skill level enum', async () => {
      try {
        await Course.create({
          title: 'Test Course',
          description: 'Test description',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'InvalidLevel',
          price: 50
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.skillLevel).toBeTruthy();
      }
    });

    it('should validate positive price', async () => {
      try {
        await Course.create({
          title: 'Test Course',
          description: 'Test description',
          instructor: userId,
          category: 'Programming',
          skillLevel: 'Beginner',
          price: -10
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.price).toBeTruthy();
      }
    });
  });
});
