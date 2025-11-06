import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../lightswind/tabs";

export default function AdminManageTabs({ activeTab, onChange }) {
  return (
    <Tabs value={activeTab} onValueChange={onChange} className="w-full">
      <TabsList className="manage-tabs rounded-full h-9 px-1">
        <TabsTrigger
          value="students"
          className="px-3 font-semibold bg-transparent data-[state=inactive]:text-gray-900"
        >
          Students
        </TabsTrigger>
        <TabsTrigger
          value="advisors"
          className="px-3 font-semibold bg-transparent data-[state=inactive]:text-gray-900"
        >
          Advisors
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}