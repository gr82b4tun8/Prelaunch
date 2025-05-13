// pages/NotificationsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    SafeAreaView,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { supabase } from '../lib/supabaseClient'; // Uncomment when ready to fetch real notifications
// import { useApp } from '../contexts/AppContext'; // Uncomment if user context is needed

// Define the structure of a notification item
interface NotificationItem {
    id: string;
    type: 'like' | 'match' | 'message'; // Example types
    title: string;
    body: string;
    timestamp: Date;
    read: boolean;
    // Optional: Add sender_profile_picture_url, sender_name, etc. for richer notifications
}

// Mock data for demonstration purposes
const MOCK_NOTIFICATIONS: NotificationItem[] = [
    { id: '1', type: 'like', title: 'New Like!', body: 'Someone liked your profile.', timestamp: new Date(Date.now() - 3600000), read: false },
    { id: '2', type: 'match', title: 'It\'s a Match!', body: 'You have a new match.', timestamp: new Date(Date.now() - 7200000), read: true },
    { id: '3', type: 'like', title: 'New Like!', body: 'Another user liked your profile.', timestamp: new Date(Date.now() - 10800000), read: false },
    { id: '4', type: 'message', title: 'New Message!', body: 'You received a new message.', timestamp: new Date(Date.now() - 12800000), read: false },
];

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    // const { user } = useApp(); // If using AppContext

    useEffect(() => {
        // Simulate fetching notifications
        const fetchNotifications = async () => {
            setLoading(true);
            // TODO: Replace with actual API call to fetch notifications
            // Example:
            // if (!user) {
            //   setLoading(false);
            //   setNotifications([]);
            //   return;
            // }
            // try {
            //   const { data, error } = await supabase
            //     .from('notifications') // Assuming you have a 'notifications' table
            //     .select('*')
            //     .eq('recipient_user_id', user.id) // Filter for the current user
            //     .order('created_at', { ascending: false });
            //
            //   if (error) throw error;
            //   // Transform Supabase data to NotificationItem[] if necessary
            //   setNotifications(data.map(n => ({...n, timestamp: new Date(n.created_at)})));
            // } catch (error) {
            //   console.error('Error fetching notifications:', error);
            //   // Handle error (e.g., show a message to the user)
            // } finally {
            //   setLoading(false);
            // }

            // Using mock data for now
            setTimeout(() => {
                setNotifications(MOCK_NOTIFICATIONS.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
                setLoading(false);
            }, 1000);
        };

        fetchNotifications();
    }, [/* user */]); // Add user to dependency array if using it in fetchNotifications

    const handleNotificationPress = (item: NotificationItem) => {
        console.log('Notification pressed:', item.id);
        // Example: Navigate to a specific screen based on notification type
        // if (item.type === 'match') {
        //   navigation.navigate('ChatScreen', { matchId: item.related_id });
        // } else if (item.type === 'like') {
        //   navigation.navigate('UserProfileScreen', { userId: item.sender_id });
        // }

        // Mark notification as read (locally or update backend)
        setNotifications(prevNotifications =>
            prevNotifications.map(n =>
                n.id === item.id ? { ...n, read: true } : n
            )
        );
        // TODO: Add API call to mark notification as read in the backend
        // try {
        //   await supabase.from('notifications').update({ read: true }).eq('id', item.id);
        // } catch (error) {
        //   console.error('Error marking notification as read:', error);
        // }
    };

    const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
        <Pressable
            style={[styles.notificationItem, !item.read && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationTextContainer}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationBody}>{item.body}</Text>
                <Text style={styles.notificationTimestamp}>{item.timestamp.toLocaleString()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (notifications.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <Text style={styles.noNotificationsText}>You have no notifications yet.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContentContainer}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F0F2F5', // Light grey background
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
    noNotificationsText: {
        fontSize: 18,
        color: '#666',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1c1c1e',
        paddingHorizontal: 15,
        paddingTop: 20, // Adjust as needed, especially if not using react-navigation header
        paddingBottom: 10,
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    notificationItem: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 3,
    },
    unreadItem: {
        backgroundColor: '#E6F2FF', // A slightly different background for unread items
        borderLeftWidth: 4,
        borderLeftColor: '#FF6347', // Accent color for unread indicator
    },
    notificationTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    notificationTitle: {
        fontSize: 17,
        fontWeight: '600', // Semibold
        color: '#2c3e50', // Darker text color
        marginBottom: 3,
    },
    notificationBody: {
        fontSize: 15,
        color: '#34495e', // Slightly lighter than title
        lineHeight: 20,
    },
    notificationTimestamp: {
        fontSize: 12,
        color: '#7f8c8d', // Grey color for timestamp
        marginTop: 8,
    },
    unreadDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF6347', // Accent color
    },
});