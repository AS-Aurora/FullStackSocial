"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/hello/")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Next.js + Django</h1>
      <p>{data ? data.message : "Loading..."}</p>
    </main>
  );
}
