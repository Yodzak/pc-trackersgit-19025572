import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  Calendar as CalendarIcon,
  Trash2,
  Clock,
  X,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { CalendarEvent } from '@/types';
import { getEventTypeLabel } from '@/utils';
import * as Haptics from 'expo-haptics';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const EVENT_TYPES: Array<CalendarEvent['type']> = ['meeting', 'deadline', 'payment', 'alert'];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'alert': return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
    case 'deadline': return { bg: Colors.goldLight, text: '#A16207', border: Colors.goldMedium };
    case 'payment': return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' };
    default: return { bg: Colors.blue100, text: Colors.blue600, border: '#93C5FD' };
  }
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { events, addEvent, deleteEvent } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('meeting');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDay = useMemo(() => {
    const raw = new Date(year, month, 1).getDay();
    return raw === 0 ? 6 : raw - 1;
  }, [year, month]);

  const prevMonth = useCallback(() => setCurrentDate(new Date(year, month - 1, 1)), [year, month]);
  const nextMonth = useCallback(() => setCurrentDate(new Date(year, month + 1, 1)), [year, month]);

  const getEventsForDay = useCallback((day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  }, [events, year, month]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateForEvent(dateStr);
    setNewEventTitle('');
    setNewEventType('meeting');
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveEvent = () => {
    if (!newEventTitle.trim() || !selectedDateForEvent) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et la date');
      return;
    }
    addEvent({
      title: newEventTitle.trim(),
      date: selectedDateForEvent,
      type: newEventType,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  };

  const handleDeleteEvent = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Supprimer ?', 'Supprimer cette alerte ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteEvent(id) },
    ]);
  };

  const today = new Date();

  const calendarDays = useMemo(() => {
    const days: Array<{ type: 'empty'; key: string } | { type: 'day'; day: number; key: string }> = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ type: 'empty', key: `empty-${i}` });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ type: 'day', day: i, key: `day-${i}` });
    }
    return days;
  }, [firstDay, daysInMonth]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <Text style={styles.headerSubtitle}>Gérez vos rendez-vous et échéances</Text>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
            <ChevronLeft size={20} color={Colors.brandGold} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
            <ChevronRight size={20} color={Colors.brandGold} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <View style={styles.daysHeader}>
            {DAYS.map((d) => (
              <View key={d} style={styles.dayHeaderCell}>
                <Text style={styles.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((cell) => {
              if (cell.type === 'empty') {
                return <View key={cell.key} style={styles.calendarCell} />;
              }
              const dayEvents = getEventsForDay(cell.day);
              const isToday =
                today.getDate() === cell.day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[styles.calendarCell, isToday && styles.calendarCellToday]}
                  onPress={() => handleDayClick(cell.day)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                    <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                      {cell.day}
                    </Text>
                  </View>
                  {dayEvents.length > 0 && (
                    <View style={styles.eventDotsRow}>
                      {dayEvents.slice(0, 3).map((ev) => {
                        const color = getTypeColor(ev.type);
                        return (
                          <View
                            key={ev.id}
                            style={[styles.eventDot, { backgroundColor: color.text }]}
                          />
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <Bell size={18} color={Colors.brandDark} />
            <Text style={styles.alertsTitle}>Prochaines Alertes</Text>
          </View>

          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const color = getTypeColor(event.type);
              return (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventCardTop}>
                    <View style={[styles.eventTypeBadge, { backgroundColor: color.bg }]}>
                      <Text style={[styles.eventTypeText, { color: color.text }]}>
                        {getEventTypeLabel(event.type)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={14} color={Colors.slate300} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventDateRow}>
                    <Clock size={12} color={Colors.slate400} />
                    <Text style={styles.eventDateText}>
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyAlerts}>
              <CalendarIcon size={40} color={Colors.slate300} />
              <Text style={styles.emptyAlertsText}>Aucune alerte à venir</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addAlertBtn}
            onPress={() => {
              setSelectedDateForEvent(new Date().toISOString().split('T')[0]);
              setNewEventTitle('');
              setNewEventType('meeting');
              setShowModal(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={18} color={Colors.white} />
            <Text style={styles.addAlertText}>Ajouter une alerte</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Alerte</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.slate500} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>TITRE</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Réunion chantier..."
                placeholderTextColor={Colors.slate300}
                value={newEventTitle}
                onChangeText={setNewEventTitle}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>DATE</Text>
              <Text style={styles.dateDisplay}>{selectedDateForEvent}</Text>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>TYPE</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((type) => {
                  const color = getTypeColor(type);
                  const isActive = newEventType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: isActive ? color.bg : Colors.slate50,
                          borderColor: isActive ? color.border : 'transparent',
                        },
                      ]}
                      onPress={() => setNewEventType(type)}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          { color: isActive ? color.text : Colors.slate500 },
                        ]}
                      >
                        {getEventTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEvent}>
                <Text style={styles.modalSaveText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  header: {
    backgroundColor: Colors.brandDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    textTransform: 'capitalize',
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: 10,
  },
  calendarCellToday: {
    backgroundColor: 'rgba(47,79,79,0.06)',
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberToday: {
    backgroundColor: Colors.brandDark,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.slate700,
  },
  dayTextToday: {
    color: Colors.white,
  },
  eventDotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  alertsSection: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: Colors.goldLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.goldMedium,
  },
  alertsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  eventCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.slate700,
    marginBottom: 4,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventDateText: {
    fontSize: 12,
    color: Colors.slate400,
  },
  emptyAlerts: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyAlertsText: {
    fontSize: 13,
    color: Colors.slate400,
  },
  addAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brandDark,
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addAlertText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(47,79,79,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.slate500,
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.slate700,
  },
  dateDisplay: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.slate700,
    backgroundColor: Colors.slate50,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.slate500,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.brandGold,
    shadowColor: Colors.brandGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
});
