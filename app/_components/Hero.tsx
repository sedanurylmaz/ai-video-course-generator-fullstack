import React from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Send } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QUICK_VIDEO_SUGGESTIONS } from '@/data/constant'
import { index } from 'drizzle-orm/gel-core'

function Hero() {
  return (
    <div>
        <div className='flex items-center flex-col mt-20'>
            <h2 className='text-4xl font-bold'>Learn Smarter with <span className='text-primary'>AI Video Courses</span></h2>
            <p className='text-denter text-gray-500 mt-3 text-xl'>Turn Any Topic a Complete Course</p>
            <div className="grid w-full max-w-xl mt-5 gap-6 bg-white z-10">
                <InputGroup>
                    <InputGroupTextarea
                    data-slot="input-group-control"
                    className="flex field-sizing-content min-h-16 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
                    placeholder="Autoresize textarea..."
                    />
                    <InputGroupAddon align="block-end">
                        <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="full-course" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="full-course">Full Course</SelectItem>
                            <SelectItem value="quick-explain-video">Quick Explain Video</SelectItem>
                        </SelectContent>
                        </Select>
                    <InputGroupButton className="ml-auto" size="icon-sm" variant="default">
                        <Send/>
                    </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
        <div className='flex items-center gap-5 mt-5 max-w-4xl mx-auto flex-wrap justify-center'>
            {QUICK_VIDEO_SUGGESTIONS.map((suggestions,index)=>(
                <h2 key={index} className='border rounded-2xl px-2 pd-1 text-smaller bg-white z-10'>{suggestions.title}</h2>
            ))}
        </div>
    </div>
  )
}

export default Hero