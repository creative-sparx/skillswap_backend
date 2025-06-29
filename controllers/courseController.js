import Course from '../models/Course.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Get all courses with filters
// @route   GET /api/courses
// @access  Public
export const getCourses = asyncHandler(async (req, res) => {
  const {
    category,
    level,
    priceType, // 'free' or 'paid'
    search,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 12
  } = req.query;

  // Build filter object
  const filter = {};
  
  if (category && category !== 'all') {
    filter.category = category;
  }
  
  if (level && level !== 'all') {
    filter.level = level;
  }
  
  if (priceType === 'free') {
    filter.price = 0;
  } else if (priceType === 'paid') {
    filter.price = { $gt: 0 };
  }
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  try {
    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName username avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-modules.content'); // Exclude detailed content for list view

    const total = await Course.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCourses: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    throw new AppError('Error fetching courses', 500);
  }
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'firstName lastName username avatar bio skillsToTeach')
    .populate('enrolledUsers', 'firstName lastName username avatar');

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if user is enrolled (if authenticated)
  let isEnrolled = false;
  if (req.user) {
    isEnrolled = course.enrolledUsers.some(user => 
      user._id.toString() === req.user.id
    );
  }

  res.json({
    success: true,
    data: {
      course,
      isEnrolled
    }
  });
});

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollInCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  // Get course and user
  const course = await Course.findById(courseId);
  const user = await User.findById(userId);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if already enrolled
  if (course.enrolledUsers.includes(userId)) {
    throw new AppError('Already enrolled in this course', 400);
  }

  // Check if user is trying to enroll in their own course
  if (course.instructor.toString() === userId) {
    throw new AppError('Cannot enroll in your own course', 400);
  }

  // Handle enrollment based on course price
  if (course.price === 0) {
    // Free course - direct enrollment
    await enrollUserInCourse(course, user);
    
    res.json({
      success: true,
      message: 'Successfully enrolled in free course',
      data: {
        courseId: course._id,
        courseName: course.title,
        enrollmentType: 'free'
      }
    });
  } else {
    // Paid course - check wallet balance
    if (user.wallet.balance < course.price) {
      throw new AppError(
        `Insufficient tokens. Required: ${course.price}, Available: ${user.wallet.balance}`,
        400
      );
    }

    // Deduct tokens and enroll
    user.wallet.balance -= course.price;
    user.wallet.totalSpent += course.price;
    await user.save();

    // Add earnings to instructor
    const instructor = await User.findById(course.instructor);
    if (instructor) {
      instructor.wallet.balance += course.price;
      instructor.wallet.totalEarnings += course.price;
      await instructor.save();
    }

    await enrollUserInCourse(course, user);

    res.json({
      success: true,
      message: 'Successfully enrolled in paid course',
      data: {
        courseId: course._id,
        courseName: course.title,
        enrollmentType: 'paid',
        tokensDeducted: course.price,
        remainingBalance: user.wallet.balance
      }
    });
  }
});

// @desc    Get user's enrolled courses
// @route   GET /api/courses/my-enrollments
// @access  Private
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await User.findById(userId)
    .populate({
      path: 'coursesEnrolled',
      populate: {
        path: 'instructor',
        select: 'firstName lastName username avatar'
      }
    });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      enrolledCourses: user.coursesEnrolled
    }
  });
});

// @desc    Get user's created courses
// @route   GET /api/courses/my-courses
// @access  Private
export const getMyCourses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const courses = await Course.find({ instructor: userId })
    .populate('enrolledUsers', 'firstName lastName username avatar')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      courses,
      totalCourses: courses.length
    }
  });
});

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Tutors only)
export const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    level,
    price,
    tags,
    modules,
    requirements,
    learningObjectives,
    certificateEnabled
  } = req.body;

  // Validate required fields
  if (!title || !description || !category || !level) {
    throw new AppError('Please provide all required fields', 400);
  }

  // Check if user is a tutor
  if (!req.user.isTutor) {
    throw new AppError('Only tutors can create courses', 403);
  }

  const course = await Course.create({
    title,
    description,
    category,
    level,
    price: price || 0,
    tags: tags || [],
    modules: modules || [],
    requirements: requirements || [],
    learningObjectives: learningObjectives || [],
    certificateEnabled: certificateEnabled || false,
    instructor: req.user.id
  });

  // Add course to user's created courses
  await User.findByIdAndUpdate(req.user.id, {
    $push: { coursesCreated: course._id }
  });

  const populatedCourse = await Course.findById(course._id)
    .populate('instructor', 'firstName lastName username avatar');

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      course: populatedCourse
    }
  });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Course owner only)
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if user owns the course
  if (course.instructor.toString() !== req.user.id) {
    throw new AppError('Not authorized to update this course', 403);
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('instructor', 'firstName lastName username avatar');

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: {
      course: updatedCourse
    }
  });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Course owner only)
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if user owns the course
  if (course.instructor.toString() !== req.user.id) {
    throw new AppError('Not authorized to delete this course', 403);
  }

  // Remove course from all enrolled users
  await User.updateMany(
    { coursesEnrolled: course._id },
    { $pull: { coursesEnrolled: course._id } }
  );

  // Remove course from instructor's created courses
  await User.findByIdAndUpdate(course.instructor, {
    $pull: { coursesCreated: course._id }
  });

  await Course.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

// @desc    Get course analytics (for instructors)
// @route   GET /api/courses/:id/analytics
// @access  Private (Course owner only)
export const getCourseAnalytics = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('enrolledUsers', 'firstName lastName username createdAt');

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if user owns the course
  if (course.instructor.toString() !== req.user.id) {
    throw new AppError('Not authorized to view analytics for this course', 403);
  }

  const analytics = {
    totalEnrollments: course.enrolledUsers.length,
    totalRevenue: course.price * course.enrolledUsers.length,
    averageRating: course.rating,
    totalReviews: course.reviews.length,
    enrollmentsByMonth: getEnrollmentsByMonth(course.enrolledUsers),
    recentEnrollments: course.enrolledUsers
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
  };

  res.json({
    success: true,
    data: {
      analytics
    }
  });
});

// Helper function to enroll user in course
const enrollUserInCourse = async (course, user) => {
  // Add user to course enrolled users
  course.enrolledUsers.push(user._id);
  course.totalEnrollments += 1;
  await course.save();

  // Add course to user's enrolled courses
  user.coursesEnrolled.push(course._id);
  await user.save();

  // Award points for enrollment
  await user.addPoints(10, 'Course enrollment');
};

// Helper function to calculate enrollments by month
const getEnrollmentsByMonth = (enrolledUsers) => {
  const enrollmentsByMonth = {};
  
  enrolledUsers.forEach(user => {
    const monthYear = new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
    
    enrollmentsByMonth[monthYear] = (enrollmentsByMonth[monthYear] || 0) + 1;
  });
  
  return enrollmentsByMonth;
};
