
import Loading from '@/components/Loading';
import VerifyOtp from '@/components/verifyOtp';
import React, {Suspense} from 'react';

const VerifyPage = () => {
    

    return (
        <Suspense fallback={<Loading/>}>
            <VerifyOtp/>
        </Suspense>

    )
};

export default VerifyPage;
