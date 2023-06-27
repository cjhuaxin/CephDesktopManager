import { SvgIcon, SvgIconProps } from '@mui/material';

export default function BucketIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props}>
            {/* credit: plus icon from https://heroicons.com/ */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M 18.164062 3.359375 L 5.054688 3.359375 C 5.054688 3.359375 4.058594 3.488281 3.9375 4.417969 C 3.9375 5.089844 3.972656 5.183594 3.972656 5.183594 L 5.882812 17.195312 C 5.882812 17.195312 6.074219 18.480469 6.855469 18.480469 L 16.363281 18.480469 C 17.144531 18.480469 17.332031 17.191406 17.332031 17.191406 L 19.246094 5.191406 C 19.246094 5.191406 19.28125 5.101562 19.28125 4.425781 C 19.160156 3.496094 18.164062 3.359375 18.164062 3.359375 Z M 16.800781 13.679688 L 6.238281 13.679688 L 6.238281 12.71875 L 16.800781 12.71875 Z M 17.039062 9.121094 L 6 9.121094 L 6 8.160156 L 17.039062 8.160156 Z M 17.039062 9.121094 "
                />
            </svg>
        </SvgIcon>
    );
}

