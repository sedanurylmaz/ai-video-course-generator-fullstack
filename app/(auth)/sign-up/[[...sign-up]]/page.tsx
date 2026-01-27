import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className='flex w-full h-full items-center justify-center mt-10'>
            <SignUp />
        </div>
  )
}