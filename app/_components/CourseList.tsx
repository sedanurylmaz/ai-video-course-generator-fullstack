"use client"
import { Course } from '@/type/CourseType';
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import CourseListCard from './CourseListCard';

function CourseList() {

  const [courseList, setCourseList] = useState<Course []>([]);

  useEffect(()=>{
    GetCourseList();
  }, [])

  const GetCourseList=async()=>{
    const result=await axios.get('/api/course');
    console.log(result.data)
    setCourseList(result.data);
  }

  return (
    <div className='max-w-6xl mt-10'>
      <h2 className='font-bold text-2xl'>My Courses</h2>

      <div className='grid grid-cold-2 md:grid-cols-3 xl: grid-cols-3 gap-3'>
        {courseList?.map((course, index) => (
          <CourseListCard courseItem={course} key={index} />
        ))}
      </div>
    </div>
)
}

export default CourseList