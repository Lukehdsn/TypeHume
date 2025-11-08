import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <SignUp
        fallbackRedirectUrl="/app"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "rounded-2xl shadow-lg",
            socialButtonsBlockButton: "rounded-lg",
            formButtonPrimary: "bg-[#7B7EFF] hover:bg-[#646CFF] rounded-lg",
            footerActionLink: "text-[#7B7EFF] hover:text-[#646CFF]",
          },
        }}
      />
    </div>
  );
}
