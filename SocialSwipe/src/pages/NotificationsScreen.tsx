// pages/NotificationsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    // SafeAreaView, // Will use custom SafeAreaView handling with insets
    Pressable,
    ActivityIndicator,
    Platform, // Added for platform-specific styling
    Image, // Added for potential sender avatar
    Alert, // Added in case we need it for future actions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient'; // Make sure this path is correct

// Import navigation types (adjust path as needed)
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator'; // Adjust path to your RootStackParamList

// Added imports from EditProfileScreen for styling
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'; // Import SafeAreaView from here
import { Ionicons } from '@expo/vector-icons';

// Define the structure of a notification item, including sender details
interface NotificationItem {
    id: string; // Notification ID
    type: 'like' | 'match' | 'system_update' | string;
    title: string;
    body: string;
    timestamp: Date;
    read: boolean;
    sender_user_id?: string;
    sender_first_name?: string; // Changed from sender_full_name to match typical profile data
    sender_profile_picture_url?: string | null; // Changed to singular, assuming we'll use the first one
    // related_entity_id?: string;
}

// Define the navigation prop type for this screen
type NotificationsScreenNavigationProp = NavigationProp<RootStackParamList, 'Notifications'>; // Assuming 'Notifications' is a route in RootStackParamList

export default function NotificationsScreen() {
    const navigation = useNavigation<NotificationsScreenNavigationProp>();
    const insets = useSafeAreaInsets(); // For dynamic padding like in EditProfileScreen
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
                    const senderName = n.senderProfile?.first_name || 'Someone';
                    let title = n.message || 'New Notification';
                    let body = '';

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
                    if (!body && (n.type === 'like' || n.type === 'match') && !n.message) {
                        body = title;
                    }

                    return {
                        id: n.id,
                        type: n.type,
                        title: title,
                        body: body,
                        timestamp: new Date(n.created_at),
                        read: n.read,
                        sender_user_id: n.sender_user_id,
                        sender_first_name: n.senderProfile?.first_name,
                        sender_profile_picture_url: n.senderProfile?.profile_pictures?.[0] || null, // Use first picture
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

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [fetchNotifications])
    );

    const handleNotificationPress = async (item: NotificationItem) => {
        console.log('Notification pressed:', item.id, 'Type:', item.type, 'Sender ID:', item.sender_user_id);

        if (!item.read) {
            try {
                const { error: updateError } = await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', item.id);

                if (updateError) {
                    console.error('Error marking notification as read:', updateError);
                } else {
                    setNotifications(prevNotifications =>
                        prevNotifications.map(n =>
                            n.id === item.id ? { ...n, read: true } : n
                        )
                    );
                }
            } catch (err) {
                console.error('Failed to update notification read status:', err);
            }
        }

        if ((item.type === 'like' || item.type === 'match') && item.sender_user_id) {
             // Ensure 'ProfileDetail' exists in your RootStackParamList and accepts userId
            if (navigation.getState().routeNames.includes('ProfileDetail')) {
                navigation.navigate('ProfileDetail' as any, { userId: item.sender_user_id });
            } else {
                console.warn("ProfileDetail screen not found in navigator. Cannot navigate.");
            }
        }
    };

    const headerDynamicStyle = {
        paddingTop: insets.top, // MODIFIED LINE: Reduced top padding
        tpaddingBotom: 10,
        paddingLeft: insets.left + 15,
        paddingRight: insets.right + 15,
    };

    const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
        <Pressable
            style={[styles.notificationItem, !item.read && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            {item.sender_profile_picture_url && (
                <Image
                    source={{ uri: item.sender_profile_picture_url }}
                    style={styles.senderAvatar}
                    onError={(e) => console.log("Failed to load sender image:", e.nativeEvent.error)}
                />
            )}
            <View style={styles.notificationTextContainer}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {item.body ? <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text> : null}
                <Text style={styles.notificationTimestamp}>{item.timestamp.toLocaleString()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    if (loading && notifications.length === 0) {
        return (
            <LinearGradient colors={['#fe9494', '#00008b']} style={styles.gradientFullScreen}>
                <SafeAreaView style={[styles.safeAreaTransparent, styles.centered]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }


    return (
        <LinearGradient colors={['#fe9494', '#00008b']} style={styles.gradientFullScreen}>
            <SafeAreaView style={styles.safeAreaTransparent}>
                <View style={[styles.headerContainer, headerDynamicStyle]}>
                    <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : null} style={styles.headerButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {/* Placeholder for a potential right-side header button if needed in the future */}
                    <View style={{ width: 48 }} /> 
                </View>

                {error && !loading && ( // Show error only if not loading and error exists
                     <View style={styles.centeredContent}>
                         <Text style={styles.noNotificationsText}>Error loading notifications.</Text>
                         <Text style={styles.errorTextDetail}>{error}</Text>
                         <Pressable onPress={fetchNotifications} style={styles.retryButton}>
                             <Text style={styles.retryButtonText}>Try Again</Text>
                         </Pressable>
                    </View>
                )}

                {!error && !loading && notifications.length === 0 && (
                    <View style={styles.centeredContent}>
                        <Ionicons name="notifications-off-outline" size={60} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.noNotificationsText}>You have no notifications yet.</Text>
                    </View>
                )}
                
                {!error && notifications.length > 0 && (
                    <FlatList
                        data={notifications}
                        renderItem={renderNotificationItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContentContainer}
                        ListFooterComponent={loading && notifications.length > 0 ? <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 20}} /> : null }
                        // The refreshControl prop on FlatList is tricky with gradients.
                        // For a pull-to-refresh indicator, you might need a more custom setup or accept system default.
                        // A simple loading indicator at the bottom (ListFooterComponent) is used for subsequent loads.
                        onRefresh={fetchNotifications} // Optional: if you want pull to refresh
                        refreshing={loading && notifications.length > 0} // Show indicator during refresh
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientFullScreen: {
        flex: 1,
    },
    safeAreaTransparent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 40,
        zIndex: 10,
        // paddingHorizontal and paddingTop/Bottom are in headerDynamicStyle
    },
    headerButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        flex: 1,
    },
    centered: { // For full screen centered content (initial load)
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredContent: { // For centered content within the list area (no notifications, error)
        flex: 1, // Takes remaining space
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#FFFFFF',
    },
    noNotificationsText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)', // Light color for gradient
        textAlign: 'center',
        marginTop:10,
    },
    errorTextDetail: {
        fontSize: 14,
        color: '#FF9494', // Adjusted red for better visibility on dark gradient
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#FF6347', // Consistent with EditProfile action color
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContentContainer: {
        paddingHorizontal: 15, // Adjusted from 10
        paddingBottom: 20, // Ensure space at the bottom
    },
    notificationItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Frosted glass effect
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 8, // Increased margin
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        // Removed direct shadow as it might not look good on gradient, border gives definition
    },
    unreadItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Slightly different for unread
        borderLeftWidth: 4,
        borderLeftColor: '#FFDDC1', // Lighter accent for unread, or use #FF6347
        // borderColor: 'rgba(255, 221, 193, 0.5)', // Brighter border for unread if desired
    },
    senderAvatar: {
        width: 45, // Slightly larger
        height: 45,
        borderRadius: 22.5, // Half of width/height
        marginRight: 15,
        backgroundColor: 'rgba(255,255,255,0.2)', // Placeholder bg
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    notificationTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    notificationTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF', // White for gradient
        marginBottom: 4,
    },
    notificationBody: {
        fontSize: 15,
        color: '#E0E0E0', // Lighter gray for gradient
        lineHeight: 20,
    },
    notificationTimestamp: {
        fontSize: 12,
        color: '#B0B0B0', // Light gray for gradient
        marginTop: 8,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6347', // Action color for dot, stands out
        marginLeft: 5, // Added some space if avatar is not present
    },
});