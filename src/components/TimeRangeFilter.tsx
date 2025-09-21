import { Calendar, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type TimeRange = 7 | 30;

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Time Range:</span>
      </div>
      <Select
        value={value.toString()}
        onValueChange={(newValue) => {
          if (newValue === "7" || newValue === "30") {
            onChange(parseInt(newValue) as TimeRange);
          }
        }}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7" className="text-sm">
            Last 7 Days
          </SelectItem>
          <SelectItem value="30" className="text-sm">
            Last 30 Days
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}