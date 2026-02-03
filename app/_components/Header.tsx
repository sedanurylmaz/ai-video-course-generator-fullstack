"use client";
import { UserButton, useUser } from '@clerk/nextjs'
import React from 'react'
import Image from 'next/image'
import { SignIn, SignInButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import Link from "next/link";

function Header() {
  const { user } = useUser();
  return (
    <div className='flex items-center justify-between p-4'>
      <div className='flex gap-2 items-center'>
          <Image src="/logo.png" alt="logo" width={60} height={60} />
          <h2 className='text-xl font-bold'><span className='text-primary'>Video</span>Course</h2>
      </div>
      <ul className='flex gap-8 items-center'>
        <Link href={'/'}>
          <li className='text-lg hover:text-primary font font-medium cursor-pointer'>Home</li>
        </Link>
        <Link href={'/pricing'}>
          <li className='text-lg hover:text-primary font font-medium cursor-pointer'>Pricing</li>
        </Link>
      </ul>

      {user ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <Button>Get Started</Button>
          </SignInButton>
        )
      }

    </div>
  )
}

export default Header