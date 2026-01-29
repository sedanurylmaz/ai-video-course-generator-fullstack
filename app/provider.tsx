"use client"

import React, { useState } from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { userDetailContext } from '@/context/UserDetailContext';

function Provider({children}: {children: React.ReactNode}) {

    const [userDetail,setUserDetail] = useState(null);

    useEffect(()=>{
        CreateNewUser();
    },[])

    const CreateNewUser = async() => {
        // user API endpoint to create a new user
        const result = await axios.post('/api/user',{});
        console.log(result.data);
        setUserDetail(result?.data);
    }

    return (
        <div>
            <userDetailContext.Provider value={{ userDetail,setUserDetail }}>
                <div className='max-w-7xl mx-auto'>
                    {children}
                </div>
            </userDetailContext.Provider>
        </div>
    )
}

export default Provider

