import Home from "@/components/landing/Home";
import { createClient } from "@/utils/supabase/server";

export default async function Index() {
  const canInitSupabaseClient = () => {
    // This function is just for the interactive tutorial.
    // Feel free to remove it once you have Supabase connected.
    try {
      createClient();
      return true;
    } catch (e) {
      return false;
    }
  };

  const isSupabaseConnected = canInitSupabaseClient();

  return (
    <Home/>

    // <div
    //   className="hero min-h-screen"
    //   style={{
    //     backgroundImage: "url('/images/hero-bg.png')",
    //   }}
    // >
    //   <div
    //     className="hero-content text-neutral-content text-center"
    //     style={{
    //       top: "33.33%",
    //       position: "absolute",
    //       width: "100%",
    //       transform: "translateY(-50%)",
    //     }}
    //   >
    //     <div className="max-w-full">
    //       <h1 className="text-[8vw] font-extrabold tracking-tight lg:text-[6vw]">
    //         L 4 D 2
    //       </h1>
    //     </div>
    //   </div>
    // </div>

    // <div className="flex-1 w-full flex flex-col gap-20 items-center">
    //   <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
    //     <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
    //       <DeployButton />
    //       {isSupabaseConnected && <AuthButton />}
    //     </div>
    //   </nav>

    //   <div className="flex-1 flex flex-col gap-20 max-w-4xl px-3">
    //     <Header />
    //     <main className="flex-1 flex flex-col gap-6">
    //       <h2 className="font-bold text-4xl mb-4">Next steps</h2>
    //       {isSupabaseConnected ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
    //       <Home />

    //     </main>
    //   </div>
    // </div>
  );
}
