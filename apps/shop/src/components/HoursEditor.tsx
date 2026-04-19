/**
 * HoursEditor component
 * Day-wise business hours editor
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { DayHours } from '@/types/shopSettings';

interface HoursEditorProps {
  hours: DayHours[];
  onChange: (hours: DayHours[]) => void;
}

export function HoursEditor({ hours, onChange }: HoursEditorProps) {
  const [editingDay, setEditingDay] = React.useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<'start' | 'end'>('start');

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const handleTimeChange = (day: string, mode: 'start' | 'end', time: Date) => {
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(
      time.getMinutes()
    ).padStart(2, '0')}`;

    const updated = hours.map((h) => {
      if (h.day === day) {
        return mode === 'start'
          ? { ...h, openTime: timeStr }
          : { ...h, closeTime: timeStr };
      }
      return h;
    });

    onChange(updated);
    setShowTimePicker(false);
  };

  const toggleClosed = (day: string) => {
    const updated = hours.map((h) => {
      if (h.day === day) {
        return { ...h, isClosed: !h.isClosed };
      }
      return h;
    });
    onChange(updated);
  };

  return (
    <View>
      {days.map((day) => {
        const dayHours = hours.find((h) => h.day === day);
        if (!dayHours) return null;

        return (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayName}>{day}</Text>

            {dayHours.isClosed ? (
              <Text style={styles.closedText}>CLOSED</Text>
            ) : (
              <View style={styles.timesContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setEditingDay(day);
                    setPickerMode('start');
                    setShowTimePicker(true);
                  }}
                >
                  <MaterialIcons name="schedule" size={16} color="#1976D2" />
                  <Text style={styles.timeText}>{dayHours.openTime}</Text>
                </TouchableOpacity>

                <Text style={styles.timeSeparator}>–</Text>

                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setEditingDay(day);
                    setPickerMode('end');
                    setShowTimePicker(true);
                  }}
                >
                  <MaterialIcons name="schedule" size={16} color="#1976D2" />
                  <Text style={styles.timeText}>{dayHours.closeTime}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => toggleClosed(day)}
            >
              <MaterialIcons
                name={dayHours.isClosed ? 'lock' : 'lock-open'}
                size={18}
                color={dayHours.isClosed ? '#E53935' : '#7CB342'}
              />
            </TouchableOpacity>
          </View>
        );
      })}

      {showTimePicker && editingDay && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            if (date) {
              handleTimeChange(editingDay, pickerMode, date);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 50,
  },
  timesContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  closedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#E53935',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
