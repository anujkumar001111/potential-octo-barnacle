/**
 * Agent Plan Embedded Component
 * 
 * Compact version for embedding in AI conversation messages
 */

"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Type definitions
export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  tools?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

interface AgentPlanEmbeddedProps {
  tasks: Task[];
  compact?: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, newStatus: string) => void;
}

export default function AgentPlanEmbedded({
  tasks,
  compact = false,
  onTaskStatusChange,
  onSubtaskStatusChange,
}: AgentPlanEmbeddedProps) {
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getStatusIcon = (status: string, size: "sm" | "md" = "md") => {
    const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
    
    switch (status) {
      case "completed":
        return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
      case "in-progress":
        return <CircleDotDashed className={`${sizeClass} text-blue-500`} />;
      case "need-help":
        return <CircleAlert className={`${sizeClass} text-yellow-500`} />;
      case "failed":
        return <CircleX className={`${sizeClass} text-red-500`} />;
      default:
        return <Circle className={`${sizeClass}`} style={{ color: "rgba(255, 255, 255, 0.4)" }} />;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in-progress":
        return "bg-blue-100 text-blue-700";
      case "need-help":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "";
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border ${compact ? "p-2" : "p-3"}`}
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="space-y-1">
        {tasks.map((task) => {
          const isExpanded = expandedTasks.includes(task.id);
          const isCompleted = task.status === "completed";

          return (
            <div key={task.id} className="space-y-1">
              {/* Task row */}
              <div
                className="group flex cursor-pointer items-center rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                onClick={() => toggleTaskExpansion(task.id)}
              >
                <div className="mr-2 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" style={{ color: "rgba(255, 255, 255, 0.6)" }} />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: "rgba(255, 255, 255, 0.6)" }} />
                  )}
                </div>

                <div className="mr-2 flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <span
                    className={`truncate text-sm ${isCompleted ? "line-through" : ""}`}
                    style={{
                      color: isCompleted
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(255, 255, 255, 0.9)",
                    }}
                  >
                    {task.title}
                  </span>

                  <div className="ml-2 flex items-center gap-1.5">
                    {task.subtasks.length > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "rgba(255, 255, 255, 0.5)" }}
                      >
                        {task.subtasks.filter((s) => s.status === "completed").length}/
                        {task.subtasks.length}
                      </span>
                    )}
                    
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${getStatusBadgeStyle(task.status)}`}
                      style={
                        task.status === "pending"
                          ? {
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "rgba(255, 255, 255, 0.7)",
                            }
                          : {}
                      }
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              <AnimatePresence>
                {isExpanded && task.subtasks.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 space-y-0.5 border-l-2 border-dashed pl-3" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}>
                      {task.subtasks.map((subtask) => {
                        const subtaskKey = `${task.id}-${subtask.id}`;
                        const isSubtaskExpanded = expandedSubtasks[subtaskKey];

                        return (
                          <div key={subtask.id} className="space-y-0.5">
                            <div
                              className="flex cursor-pointer items-center rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                              onClick={() => toggleSubtaskExpansion(task.id, subtask.id)}
                            >
                              <div className="mr-2 flex-shrink-0">
                                {getStatusIcon(subtask.status, "sm")}
                              </div>

                              <span
                                className={`flex-1 truncate text-xs ${
                                  subtask.status === "completed" ? "line-through" : ""
                                }`}
                                style={{
                                  color:
                                    subtask.status === "completed"
                                      ? "rgba(255, 255, 255, 0.5)"
                                      : "rgba(255, 255, 255, 0.85)",
                                }}
                              >
                                {subtask.title}
                              </span>
                            </div>

                            {/* Subtask details */}
                            <AnimatePresence>
                              {isSubtaskExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="ml-6 overflow-hidden"
                                >
                                  <div className="space-y-1 rounded-md p-2" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                                    <p
                                      className="text-xs"
                                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
                                    >
                                      {subtask.description}
                                    </p>

                                    {subtask.tools && subtask.tools.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span
                                          className="text-[10px] font-medium"
                                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                                        >
                                          Tools:
                                        </span>
                                        {subtask.tools.map((tool, idx) => (
                                          <span
                                            key={idx}
                                            className="rounded px-1.5 py-0.5 text-[10px]"
                                            style={{
                                              background: "rgba(255, 255, 255, 0.08)",
                                              color: "rgba(255, 255, 255, 0.8)",
                                            }}
                                          >
                                            {tool}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
