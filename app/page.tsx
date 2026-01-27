import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <h2>WELCOME TO MY SEDANUR CHANNEL!!</h2>
      <Button>Subscribe!</Button> 
      <UserButton></UserButton>
    </div>
  );
}
