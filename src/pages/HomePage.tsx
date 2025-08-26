import React from "react";
import UploadZone from "../components/UploadZone";
import { TransactionsTable } from "../components/dbTableDisplay";
import { AccountFlowChart } from "../components/chartsDisplay";


const HomePage: React.FC = () => {
  return (
    <main className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">CSV Upload Demo</h1>
      <p className="mb-6 text-gray-600">
        Upload your CSV to see it parsed locally — nothing leaves your device.
      </p>
      <UploadZone />
      <TransactionsTable />
      <AccountFlowChart />
    </main>
  );
};

export default HomePage;