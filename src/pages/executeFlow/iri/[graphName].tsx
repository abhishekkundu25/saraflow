import { env } from "@/lib/env";
import axios from "axios";
import { getSession } from "next-auth/react";
import dynamic from "next/dynamic";

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const { graphName } = context.params;

  try {
    return {
      props: {
        graphName,
        baseUrl: env.NEXTAUTH_URL,
      },
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      notFound: true,
    };
  }
}

const Execute = dynamic(() => import("../Execute"), { ssr: false });

export default Execute;
