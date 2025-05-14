// pages/NotificationsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    SafeAreaView,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient'; // Make sure this path is correct

// Import navigation types (adjust path as needed)
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator'; // Adjust path to your RootStackParamList

// Define the structure of a notification item, including sender details
interface NotificationItem {
    id: string; // Notification ID
    type: 'like' | 'match' | 'system_update' | string; // Allow for types in DB and others
    title: string; // Dynamic title, e.g., "New Like from John!"
    body: string;  // Dynamic body, e.g., "John Doe liked your profile."
    timestamp: Date;
    read: boolean;
    sender_user_id?: string; // ID of the user who sent the like/match
    sender_full_name?: string;
    sender_profile_photo_url?: string | null;
    // related_entity_id?: string; // Optional: If you need to navigate to a specific match entity, etc.
}

// Define the navigation prop type for this screen
type NotificationsScreenNavigationProp = NavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
    const navigation = useNavigation<NotificationsScreenNavigationProp>();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        console.log("Fetching notifications...");
        setLoading(true);
        setError(null);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error(authError?.message || 'User not authenticated.');
            }
            const currentUserId = user.id;

            // Fetch notifications for the current user.
            // The 'sender_user_id' column in 'notifications' is a foreign key
            // to 'individual_profiles.user_id'.
            // PostgREST syntax `senderProfile:sender_user_id(full_name, profile_photo_url)`
            // tells Supabase to use the 'sender_user_id' foreign key to fetch related data
            // from the 'individual_profiles' table and nest it under 'senderProfile'.
            const { data: fetchedNotifications, error: fetchError } = await supabase
                .from('notifications')
                .select(`
                    id,
                    type,
                    created_at,
                    read,
                    message, 
                    related_entity_id,
                    sender_user_id, 
                    senderProfile:sender_user_id ( 
                        first_name,
                        profile_pictures
                    )
                `)
                .eq('recipient_user_id', currentUserId)
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error("Error fetching notifications:", JSON.stringify(fetchError, null, 2));
                throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
            }

            if (fetchedNotifications) {
                const transformedNotifications: NotificationItem[] = fetchedNotifications.map((n: any) => {
                    const senderName = n.senderProfile?.full_name || 'Someone';
                    let title = n.message || 'New Notification'; // Use pre-generated message if available
                    let body = ''; // Body will be more specific or also from n.message

                    if (n.type === 'like') {
                        title = n.message || `New Like from ${senderName}!`;
                        body = n.message ? '' : `${senderName} liked your profile.`;
                    } else if (n.type === 'match') {
                        title = n.message || `It's a Match with ${senderName}!`;
                        body = n.message ? '' : `You've matched with ${senderName}. Tap to see their profile.`;
                    } else if (n.type === 'system_update') {
                        title = 'System Update';
                        body = n.message || 'Important information regarding your account or the app.';
                    }
                    // If body is empty and title was based on senderName, set a default body or use title as body.
                    if (!body && (n.type === 'like' || n.type === 'match') && !n.message) {
                        body = title; // Or a more generic message
                    }


                    return {
                        id: n.id,
                        type: n.type,
                        title: title,
                        body: body,
                        timestamp: new Date(n.created_at),
                        read: n.read,
                        sender_user_id: n.sender_user_id,
                        sender_full_name: n.senderProfile?.full_name,
                        sender_profile_photo_url: n.senderProfile?.profile_photo_url,
                    };
                });
                setNotifications(transformedNotifications);
            } else {
                setNotifications([]);
            }

        } catch (err: any) {
            console.error("Error in fetchNotifications:", err);
            setError(err.message || 'An unexpected error occurred.');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Use useFocusEffect to re-fetch notifications when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [fetchNotifications])
    );

    const handleNotificationPress = async (item: NotificationItem) => {
        console.log('Notification pressed:', item.id, 'Type:', item.type, 'Sender ID:', item.sender_user_id);

        // Mark notification as read in the backend
        if (!item.read) {
            try {
                const { error: updateError } = await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', item.id);

                if (updateError) {
                    console.error('Error marking notification as read:', updateError);
                    // Optionally, revert local state or show an error
                } else {
                    // Update local state to reflect read status immediately
                    setNotifications(prevNotifications =>
                        prevNotifications.map(n =>
                            n.id === item.id ? { ...n, read: true } : n
                        )
                    );
                }
            } catch (error) {
                console.error('Failed to update notification read status:', error);
            }
        }

        // Navigate based on notification type
        // For 'like' or 'match', navigate to the sender's profile if sender_user_id exists.
        if ((item.type === 'like' || item.type === 'match') && item.sender_user_id) {
            navigation.navigate('ProfileDetail', { userId: item.sender_user_id });
        }
        // Add other navigation logic for different types if needed (e.g., 'system_update' might not navigate)
    };

    const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
        <Pressable
            style={[styles.notificationItem, !item.read && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            {/* TODO: Optionally, add an Image component here for item.sender_profile_photo_url */}
            {/* Example: 
                {item.sender_profile_photo_url && (
                    <Image 
                        source={{ uri: item.sender_profile_photo_url }} 
                        style={styles.senderAvatar} 
                        onError={(e) => console.log("Failed to load image:", e.nativeEvent.error)}
                    />
                )}
            */}
            <View style={styles.notificationTextContainer}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {item.body ? <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text> : null}
                <Text style={styles.notificationTimestamp}>{item.timestamp.toLocaleString()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    if (loading && notifications.length === 0) { // Show loading only on initial load
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!loading && error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                 <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.centered}>
                    <Text style={styles.noNotificationsText}>Error loading notifications.</Text>
                    <Text style={styles.errorTextDetail}>{error}</Text>
                    <Pressable onPress={fetchNotifications} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (!loading && notifications.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea}>
                 <Text style={styles.headerTitle}>Notifications</Text>
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
                refreshControl={
                    <ActivityIndicator animating={loading && notifications.length > 0} color="#FF6347" />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F0F2F5',
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
        textAlign: 'center',
    },
    errorTextDetail: {
        fontSize: 14,
        color: '#D32F2F', 
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#FF6347',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1c1c1e',
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: '#F0F2F5', 
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
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2, 
    },
    unreadItem: {
        backgroundColor: '#E9F5FF', 
        borderLeftWidth: 4,
        borderLeftColor: '#FF6347',
    },
    // Optional: Style for sender avatar if you add it
    // senderAvatar: {
    //     width: 40,
    //     height: 40,
    //     borderRadius: 20,
    //     marginRight: 15,
    // },
    notificationTextContainer: {
        flex: 1,
        marginRight: 10, 
    },
    notificationTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    notificationBody: {
        fontSize: 15,
        color: '#34495e',
        lineHeight: 20,
    },
    notificationTimestamp: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 8,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6347',
    },
});