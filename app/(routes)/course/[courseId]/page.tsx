"use client"
import React, { useState } from 'react'
import CourseInfoCard from './_components/CourseInfoCard'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { useEffect } from 'react';
import { Course } from '@/type/CourseType'
import CourseChapters from './_components/CourseChapters'
import { toggleVariants } from '@/components/ui/toggle'
import { toast } from 'sonner'
import { getAudioData } from '@remotion/media-utils'

function CoursePreview() {

  const {courseId} = useParams();
  const [courseDetail,setCourseDetail]=useState<Course>();

  useEffect(()=>{
    courseId&&GetCourseDetail();
  },[courseId])

  const GetCourseDetail=async()=>{
    const loadingToast=toast.loading('Fetching Course Detail...')
    const result=await axios.get('/api/course?courseId='+courseId);
    console.log(result.data);
    setCourseDetail(result.data);
    console.log(
      "CHAPTER COUNT:",
      result.data?.courseLayout?.chapters?.length
    );

    toast.success('Course Details Fetched Successfully!',{ id: loadingToast })
    if(result?.data?.chapterContentSlides?.length==0) {
      GenerateVideoContent(result?.data);
    }
  }

  const GenerateVideoContent = async(course: Course) => {
      
    for(let i=0;i<course?.courseLayout?.chapters?.length;i++) {
      //if(i>0) break;
      const toastLoading = toast.loading('Generating Video Content for Chapter ...'+(i+1));
      console.log("chapter gönderilen:", course?.courseLayout?.chapters?.[i]); //Tüm chapterlar için yaptık, tek chapter için 0 yapacaksın içini.

      const result = await axios.post('/api/generate-video-content',{
        chapter:course?.courseLayout?.chapters[i], //Tüm chapterlar için yaptık, tek chapter için 0 yapacaksın içini.
        courseId: course?.courseId
      });
      console.log(JSON.stringify(result.data));

      toast.success('Video Content Generated for Chapter'+(i+1),{ id: toastLoading })
    }

  }


     const fps = 30;
      const slides = courseDetail?.chapterContentSlides??[];
    
      const [durationsBySlideId, setDurationsBySlideId] = useState<Record<string,number>|null>(null);
      
      useEffect(()=>{
        let cancelled = false;
        const run=async()=>{
          if(!slides) return;
          const entries=await Promise.all(
            slides.map(async(slide)=>{
              const audioData=await getAudioData(slide?.audioFileUrl);
              const audioSec=audioData?.durationInSeconds;
              const frames=Math.max(1,Math.ceil(audioSec*fps));
              return [slide.slideId,frames] as const;
    
            })
          );
          if(cancelled) {
            setDurationsBySlideId(Object.fromEntries(entries))
          }
        }
        run();
    
        return () => {
          cancelled = true;
        }
    
      },[slides,fps])

  return (
    <div>
      <CourseInfoCard course={courseDetail} durationsBySlideId={durationsBySlideId}/>
      <CourseChapters course={courseDetail} durationsBySlideId={durationsBySlideId}/>
    </div>
  )
}

export default CoursePreview