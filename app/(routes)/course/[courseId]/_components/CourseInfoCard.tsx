import React, { useEffect, useMemo, useState } from 'react'
import { Course } from '@/type/CourseType'
import { BookOpen, ChartNoAxesColumnIncreasing, Sparkles } from 'lucide-react'
import { Player } from '@remotion/player' 
import { getAudioData } from '@remotion/media-utils'
import { CourseComposition } from './ChapterVideo'

type Props = {
  course: Course | undefined,
  durationsBySlideId: Record<string, number> | null
}

function CourseInfoCard({course, durationsBySlideId}: Props) {
  
  const fps = 30;
  const slides = course?.chapterContentSlides??[];

  const durationInFrames=useMemo(()=>{
    if(!durationsBySlideId) return;
    return slides.reduce((sum,slide)=>sum+(durationsBySlideId[slide.slideId]??fps*6),0)
  },[durationsBySlideId,slides,fps])

  if(!durationsBySlideId)
  {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className='p-20 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8
      bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950'>
        <div>
            <h2 className='flex gap-2 p-1 px-2 border rounded-2xl inline-flex text-white border-gray-200/70'><Sparkles/>Course Preview</h2>
            <h2 className='text-4xl font-bold mt-4 text-white'>{course?.courseName}</h2>
            <p className='text-lg text-muted-foreground mt-3'>{course?.courseLayout.courseDescription}</p>
            <div className='mt-5 flex gap-5 text-white'>
              <h2 className='px-3 p-2 border rounded-4xl flex gap-2 items-center inline-flex'><ChartNoAxesColumnIncreasing className='text-sky-400'/>{course?.courseLayout?.level}</h2>
              <h2 className='px-3 p-2 border rounded-4xl flex gap-2 items-center inline-flex'><BookOpen className='text-emerald-300'/> {course?.courseLayout?.totalChapters} Chapters</h2>
            </div>
        </div>

         <div className='border-2 border-white/10 border rounded-2xl'>
            <Player
              component={CourseComposition}
              inputProps={{
                //@ts-ignore
                slides:slides,
                durationsBySlideId: durationsBySlideId
              }}
              durationInFrames={durationInFrames && durationInFrames!==0?durationInFrames:30}
              //durationInFrames={30}
              compositionWidth={1280}
              compositionHeight={720}
              fps={30}
              controls
              style={{
                width: '100%',
                aspectRatio: '16/9'
              }}
            />
          </div>

        
      </div>
    </div>
  )
}

export default CourseInfoCard