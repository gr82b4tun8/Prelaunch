// src/pages/EditProfileScreen.tsx
// CONVERTED for React Native / Expo Go
// Includes ArrayBuffer fix for image upload
// Corrected Supabase table name for update operation
// Added MAX_PROFILE_PHOTOS constant
// ADDED Logout button, LinearGradient background, and header styling from ProfileBrowseScreen reference

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image,
    ActivityIndicator, Alert, SafeAreaView, Platform
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabaseClient'; // Adjust path
import { useApp } from '../contexts/AppContext'; // Adjust path if necessary
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfToday, subYears } from 'date-fns';

// ***** MODIFICATION START: Added imports from ProfileBrowseScreen *****
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ***** MODIFICATION END *****

// --- Constant for Max Photos ---
const MAX_PROFILE_PHOTOS = 6;

// --- Re-use Validation Schema ---
const profileSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().optional(),
    dob: z.date({ required_error: "Date of birth is required." }).refine(
        (date) => date <= subYears(startOfToday(), 18),
        { message: "Must be 18+" }
    ),
    gender: z.string().min(1, { message: "Please select a gender identity." }),
    bio: z.string().max(500, { message: "Bio must be 500 characters or less." }).optional(),
    location: z.string().optional(),
    lookingFor: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

// --- Profile type ---
interface Profile {
    id: string; created_at: string; updated_at: string; first_name: string;
    last_name?: string | null; date_of_birth: string; gender: string;
    bio?: string | null; interests?: string[] | null; location?: string | null;
    looking_for?: string | null; profile_pictures?: string[] | null;
    user_id: string;
    liked_profile_user_ids?: string[] | null;
}

type YourSpecificNavigatorParamList = {
    ProfileTab: undefined;
    WelcomeScreen: undefined;
    EditProfile: undefined;
};
type EditProfileScreenNavigationProp = NativeStackNavigationProp<YourSpecificNavigatorParamList, 'EditProfile'>;


const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation<EditProfileScreenNavigationProp>();
    const { user, isLoadingSupabase, profile: contextProfile, fetchProfile } = useApp();
    const [initialLoading, setInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentProfilePictures, setCurrentProfilePictures] = useState<string[]>([]);
    const [newImageAssets, setNewImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // ***** MODIFICATION START: Added from ProfileBrowseScreen for header styling *****
    const insets = useSafeAreaInsets();
    // ***** MODIFICATION END *****

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '', lastName: '', dob: undefined, gender: '', bio: '', location: '', lookingFor: '',
        },
    });
    const { handleSubmit, control, formState: { errors }, reset, watch } = form;
    const watchedDob = watch('dob');

    // ***** MODIFICATION START: Copied handleLogout from ProfileBrowseScreen.tsx *****
    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        const { error: signOutError } = await supabase.auth.signOut();
                        if (signOutError) {
                            Alert.alert("Logout Error", signOutError.message);
                        } else {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'WelcomeScreen' }],
                            });
                        }
                    },
                },
            ]
        );
    };
    // ***** MODIFICATION END *****

    useEffect(() => {
        if (!isLoadingSupabase && user) {
            const fetchProfileData = async () => {
                setInitialLoading(true);
                console.log("[EditProfile] Fetching profile data for user:", user.id);
                try {
                    const { data, error, status } = await supabase
                        .from('individual_profiles')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    console.log("[EditProfile] Profile fetch response:", { status, error, hasData: !!data });

                    if (error && status !== 406) {
                        console.error("[EditProfile] Supabase error fetching profile:", error);
                        throw error;
                    }
                    if (data) {
                        reset({
                            firstName: data.first_name || '', lastName: data.last_name || '',
                            dob: data.date_of_birth ? parseISO(data.date_of_birth) : undefined,
                            gender: data.gender || '', bio: data.bio || '',
                            location: data.location || '', lookingFor: data.looking_for || '',
                        });
                        setInterests(data.interests || []);
                        setCurrentProfilePictures(data.profile_pictures || []);
                        console.log("[EditProfile] Profile data loaded into form.");
                    } else {
                        console.warn("[EditProfile] No profile data found for user.");
                        Toast.show({ type: 'info', text1: 'Profile not found', text2: 'You might need to create it first.' });
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        }
                    }
                } catch (error: any) {
                    console.error("[EditProfile] Failed to fetch profile data:", error);
                    Toast.show({ type: 'error', text1: 'Failed to load data', text2: error.message });
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    }
                } finally {
                    setInitialLoading(false);
                    console.log("[EditProfile] Finished initial loading sequence.");
                }
            };
            fetchProfileData();
        } else if (!isLoadingSupabase && !user) {
            console.log("[EditProfile] No user session (from AppContext), navigating to WelcomeScreen.");
            navigation.navigate('WelcomeScreen');
        }
    }, [user, isLoadingSupabase, reset, navigation]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Sorry, we need camera roll permissions!');
            return;
        }

        const currentTotal = currentProfilePictures.length + newImageAssets.length;
        if (currentTotal >= MAX_PROFILE_PHOTOS) {
            Toast.show({ type: 'info', text1: 'Limit Reached', text2: `Max ${MAX_PROFILE_PHOTOS} photos allowed.` });
            return;
        }

        try {
            const selectionLimit = MAX_PROFILE_PHOTOS - currentTotal;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: selectionLimit > 0 ? selectionLimit : 1,
            });

            if (!result.canceled && result.assets) {
                const combined = [...newImageAssets, ...result.assets];
                const limitedNewAssets = combined.slice(0, MAX_PROFILE_PHOTOS - currentProfilePictures.length);
                if (combined.length > limitedNewAssets.length) {
                    Toast.show({ type: 'info', text1: 'Limit Exceeded', text2: `Selected images exceed the limit of ${MAX_PROFILE_PHOTOS}.` });
                }
                setNewImageAssets(limitedNewAssets);
            }
        } catch (pickerError) {
            console.error("[EditProfile] Error launching image picker:", pickerError);
            Toast.show({ type: 'error', text1: 'Image Picker Error', text2: 'Could not open image library.'});
        }
    };

    const removeImage = (uriToRemove: string) => {
        const existingIndex = currentProfilePictures.indexOf(uriToRemove);
        if (existingIndex > -1) {
            setCurrentProfilePictures(prev => prev.filter(url => url !== uriToRemove));
        } else {
            setNewImageAssets(prev => prev.filter(asset => asset.uri !== uriToRemove));
        }
    };

    const allImageUris = [
        ...currentProfilePictures,
        ...newImageAssets.map(asset => asset.uri)
    ];

    const addInterest = useCallback(() => {
        const trimmedInterest = interestInput.trim();
        if (trimmedInterest && interests.length < 10 && !interests.includes(trimmedInterest)) {
            setInterests(prev => [...prev, trimmedInterest]);
            setInterestInput('');
        } else if (interests.includes(trimmedInterest)) {
            Toast.show({ type: 'info', text1: 'Interest already added.' });
        } else if (interests.length >= 10) {
            Toast.show({ type: 'info', text1: 'Maximum 10 interests allowed.' });
        }
    }, [interestInput, interests]);

    const removeInterest = useCallback((interestToRemove: string) => {
        setInterests(prev => prev.filter(interest => interest !== interestToRemove));
    }, []);

    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleDateConfirm = useCallback((date: Date, onChange: (date: Date) => void) => {
        if (date > subYears(startOfToday(), 18)) {
            date = subYears(startOfToday(), 18);
            Toast.show({type: 'info', text1: 'Age Requirement', text2: 'Setting to earliest valid date (18+).'})
        }
        onChange(date);
        hideDatePicker();
    }, []);

    const onSubmit = async (values: ProfileFormData) => {
        if (!user) {
            Toast.show({ type: 'error', text1: 'User session not found.' }); return;
        }
        if (allImageUris.length === 0) {
            Toast.show({ type: 'error', text1: 'Missing Photos', text2: 'Please add at least one photo.'}); return;
        }

        setIsSubmitting(true);
        const uploadedNewImageUrls: string[] = [];
        console.log("[EditProfile] Starting onSubmit...");

        try {
            if (newImageAssets.length > 0) {
                Toast.show({ type: 'info', text1: "Uploading new images..." });
                for (const asset of newImageAssets) {
                    const uri = asset.uri;
                    const response = await fetch(uri);
                    if (!response.ok) throw new Error(`Failed to fetch image URI (${response.status})`);
                    const arrayBuffer = await response.arrayBuffer();
                    if (arrayBuffer.byteLength === 0) throw new Error("Cannot upload empty image file.");

                    const contentType = response.headers.get('content-type') ?? asset.mimeType ?? 'application/octet-stream';
                    const fileExtFromAsset = asset.fileName?.split('.').pop()?.toLowerCase();
                    const fileExtFromUri = uri.split('.').pop()?.toLowerCase()?.split('?')[0];
                    const fileExtFromMime = contentType.split('/')[1]?.split('+')[0];
                    const fileExt = fileExtFromAsset || fileExtFromMime || fileExtFromUri || 'jpg';
                    const fileName = `${uuidv4()}.${fileExt}`;
                    const filePath = `${user.id}/${fileName}`;

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('profile_pictures')
                        .upload(filePath, arrayBuffer, { contentType, upsert: false });

                    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
                    
                    const { data: urlData } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
                    if (!urlData?.publicUrl) {
                        Toast.show({ type: 'warning', text1: 'URL Issue', text2: 'Could not get public URL for an image.'});
                    } else {
                        uploadedNewImageUrls.push(urlData.publicUrl);
                    }
                }
                if (uploadedNewImageUrls.length === newImageAssets.length) {
                    Toast.show({ type: 'success', text1: "New images uploaded!" });
                } else if (uploadedNewImageUrls.length > 0) {
                    Toast.show({ type: 'warning', text1: "Some images uploaded", text2: "Not all new images could be processed." });
                } else if (newImageAssets.length > 0 && uploadedNewImageUrls.length === 0) {
                    Toast.show({ type: 'error', text1: "Image Upload Failed", text2: "None of the new images could be uploaded." });
                }
            }

            const finalImageUrls = [...currentProfilePictures, ...uploadedNewImageUrls];
            const profileUpdateData = {
                first_name: values.firstName,
                last_name: values.lastName || null,
                date_of_birth: format(values.dob, 'yyyy-MM-dd'),
                gender: values.gender,
                bio: values.bio || null,
                interests: interests,
                location: values.location || null,
                looking_for: values.lookingFor || null,
                profile_pictures: finalImageUrls.length > 0 ? finalImageUrls : null,
                updated_at: new Date().toISOString(),
                is_profile_complete: true
            };

            Toast.show({ type: 'info', text1: "Saving changes..." });
            const { error: updateError } = await supabase
                .from('individual_profiles')
                .update(profileUpdateData)
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            Toast.show({ type: 'success', text1: 'Profile Updated!', text2: 'Your changes saved.' });
            setNewImageAssets([]);
            setCurrentProfilePictures(finalImageUrls.length > 0 ? finalImageUrls : []);
            await fetchProfile(user.id);

            if (navigation.canGoBack()) {
                navigation.goBack();
            }

        } catch (error: any) {
            console.error('[EditProfile] Update Profile Error:', error);
            Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ***** MODIFICATION START: For header styling from ProfileBrowseScreen *****
    const headerDynamicStyle = {
        paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10), // Adjust as ProfileBrowseScreen style `paddingVertical: -20` is unusual
        paddingBottom: 10, // Provide some padding
        paddingLeft: insets.left + 15, // styles.headerContainer.paddingHorizontal
        paddingRight: insets.right + 15, // styles.headerContainer.paddingHorizontal
    };
    // ***** MODIFICATION END *****


    if (isLoadingSupabase || initialLoading) {
        // ***** MODIFICATION START: Use gradient for loading screen too *****
        return (
            <LinearGradient colors={['#fe9494', '#00008b']} style={styles.gradientFullScreen}>
                <SafeAreaView style={[styles.safeAreaTransparent, styles.centered]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Loading Profile...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
        // ***** MODIFICATION END *****
    }

    if (!user) {
        // ***** MODIFICATION START: Use gradient for this state too *****
        return (
            <LinearGradient colors={['#fe9494', '#00008b']} style={styles.gradientFullScreen}>
                <SafeAreaView style={[styles.safeAreaTransparent, styles.centered]}>
                    <Text style={styles.infoText}>User not found. Please try logging in again.</Text>
                    <Pressable onPress={() => navigation.navigate('WelcomeScreen')} style={[styles.button, {backgroundColor: 'rgba(255,255,255,0.25)'}]}>
                        <Text style={styles.buttonText}>Go to Welcome</Text>
                    </Pressable>
                </SafeAreaView>
            </LinearGradient>
        );
        // ***** MODIFICATION END *****
    }

    return (
        // ***** MODIFICATION START: Added LinearGradient wrapper *****
        <LinearGradient colors={['#fe9494', '#00008b']} style={styles.gradientFullScreen}>
            <SafeAreaView style={styles.safeAreaTransparent}>
                {/* ***** MODIFICATION START: Added new header from ProfileBrowseScreen ***** */}
                <View style={[styles.headerContainer, headerDynamicStyle]}>
                    <Pressable onPress={() => navigation.goBack()} style={[styles.headerButton]}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Edit Your Profile</Text>
                    <Pressable onPress={handleLogout} style={[styles.headerButton]}>
                         <Ionicons name="log-out-outline" size={24} color="#fff" />
                    </Pressable>
                </View>
                {/* ***** MODIFICATION END ***** */}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Basic Info Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name*</Text>
                            <Controller name="firstName" control={control} render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="Enter first name" placeholderTextColor="#bbb" editable={!isSubmitting} />
                            )} />
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                        </View>
                        {/* ... other fields ... */}
                         <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Name</Text>
                            <Controller name="lastName" control={control} render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="Enter last name" placeholderTextColor="#bbb" editable={!isSubmitting} />
                            )} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date of Birth*</Text>
                            <Controller name="dob" control={control} render={({ field: { onChange, value } }) => (
                                <>
                                    <Pressable onPress={showDatePicker} style={styles.dateButton} disabled={isSubmitting}>
                                        <Ionicons name="calendar-outline" size={20} color="#eee" style={styles.dateIcon} />
                                        <Text style={[styles.dateText, !value && styles.placeholderText]}>
                                            {value ? format(value, 'PPP') : 'Select Date'}
                                        </Text>
                                    </Pressable>
                                    <DateTimePickerModal
                                        isVisible={isDatePickerVisible}
                                        mode="date"
                                        date={value || subYears(startOfToday(), 18)}
                                        maximumDate={subYears(startOfToday(), 18)}
                                        onConfirm={(date) => handleDateConfirm(date, onChange)}
                                        onCancel={hideDatePicker}
                                        // Styling for dark mode picker if available/needed
                                        // display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        // themeVariant="dark" // Or "light" based on your app's theme
                                    />
                                </>
                            )} />
                            {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gender*</Text>
                            <Controller name="gender" control={control} render={({ field: { onChange, value } }) => (
                                <View style={styles.pickerPlaceholder}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Select Gender (e.g., Male, Female, Other)"
                                        placeholderTextColor="#bbb"
                                        value={value}
                                        onChangeText={onChange}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )} />
                            {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About You</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <Controller name="bio" control={control} render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput style={[styles.input, styles.textArea]} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="Tell us about yourself..." placeholderTextColor="#bbb" maxLength={500} multiline numberOfLines={4} editable={!isSubmitting} />
                            )} />
                            {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Interests (up to 10)</Text>
                            <View style={styles.interestInputContainer}>
                                <TextInput style={[styles.input, styles.interestInput]} value={interestInput} onChangeText={setInterestInput} placeholder="Type interest and add" placeholderTextColor="#bbb" onSubmitEditing={addInterest} editable={!isSubmitting} />
                                <Pressable style={[styles.button, styles.addButton]} onPress={addInterest} disabled={!interestInput.trim() || interests.length >= 10 || isSubmitting}>
                                    <Text style={styles.buttonText}>Add</Text>
                                </Pressable>
                            </View>
                            <View style={styles.badgeContainer}>
                                {interests.map(interest => (
                                    <View key={interest} style={styles.badge}>
                                        <Text style={styles.badgeText}>{interest}</Text>
                                        <Pressable onPress={() => removeInterest(interest)} style={styles.removeBadgeButton} disabled={isSubmitting}>
                                            <Ionicons name="close-circle" size={18} color="#fff" />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Preferences Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Location</Text>
                            <Controller name="location" control={control} render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value || ''} placeholder="e.g., Miami, FL" placeholderTextColor="#bbb" editable={!isSubmitting} />
                            )} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Looking For</Text>
                            <Controller name="lookingFor" control={control} render={({ field: { onChange, value } }) => (
                                <View style={styles.pickerPlaceholder}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Friends, Relationship"
                                        placeholderTextColor="#bbb"
                                        value={value}
                                        onChangeText={onChange}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )} />
                        </View>
                    </View>

                    {/* Photos Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Pictures*</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Add or remove photos (up to {MAX_PROFILE_PHOTOS} total)</Text>
                            <Pressable
                                style={[styles.button, styles.outlineButton]}
                                onPress={pickImage}
                                disabled={isSubmitting || allImageUris.length >= MAX_PROFILE_PHOTOS}
                            >
                                <Ionicons name="images-outline" size={18} color="#FF6347" style={{ marginRight: 8 }}/>
                                <Text style={styles.outlineButtonText}>Select New Images</Text>
                            </Pressable>
                            {allImageUris.length === 0 && form.formState.isSubmitted && <Text style={styles.errorText}>Please add at least one photo.</Text>}
                        </View>
                        <View style={styles.imageGrid}>
                            {allImageUris.map((uri) => (
                                <View key={uri} style={styles.imageContainer}>
                                    <Image source={{ uri: uri }} style={styles.imagePreview} />
                                    <Pressable
                                        style={styles.removeImageButton}
                                        onPress={() => removeImage(uri)}
                                        disabled={isSubmitting}
                                    >
                                        <Ionicons name="close-circle" size={28} color="#fff" style={styles.removeImageIcon} />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <View style={styles.buttonContainer}>
                        <Pressable style={[styles.button, styles.outlineButton, styles.cancelButton]} onPress={() => navigation.goBack()} disabled={isSubmitting}>
                            <Text style={[styles.outlineButtonText, { color: '#ccc'/* Adjusted for gradient */}]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.submitButton, (isSubmitting || allImageUris.length === 0) ? styles.buttonDisabled : {} ]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={isSubmitting || allImageUris.length === 0}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }}/> : null}
                            <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                        </Pressable>
                    </View>

                </ScrollView>
                <Toast />
            </SafeAreaView>
        </LinearGradient>
        // ***** MODIFICATION END *****
    );
};

// --- Styles ---
// Original styles are preserved and new styles/adjustments are added
const styles = StyleSheet.create({
    // ***** MODIFICATION START: Added from ProfileBrowseScreen & adjusted *****
    gradientFullScreen: {
        flex: 1,
    },
    safeAreaTransparent: { // Used for SafeAreaView inside LinearGradient
        flex: 1,
        backgroundColor: 'transparent', // Important
    },
    headerContainer: { // Adapted from ProfileBrowseScreen
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // paddingHorizontal: 15, // Moved to headerDynamicStyle
        // paddingVertical: -20, // This was unusual, adjusted in headerDynamicStyle
        minHeight: 50, // Adjusted from 100 to be more compact for this screen
        zIndex: 20,
    },
    headerButton: { // Adapted from ProfileBrowseScreen
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly more subtle
        marginHorizontal: 5, // Added margin for spacing
    },
    // headerButtonText: { // Not directly used for icon buttons, but kept if text is added
    //     color: 'white',
    //     fontSize: 14,
    //     fontWeight: '600',
    // },
    loadingText: { // For loading states on gradient
        marginTop: 10,
        fontSize: 16,
        color: '#FFFFFF',
    },
    infoText: { // For info states on gradient
        textAlign: 'center',
        fontSize: 16,
        color: 'white',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    // ***** MODIFICATION END *****

    // Original styles with necessary adjustments for gradient:
    safeArea: { flex: 1, backgroundColor: '#f8f9fa' }, // Kept for reference, but safeAreaTransparent is used
    scrollView: { flex: 1 /* backgroundColor: 'transparent' - handled by safeAreaTransparent */ },
    contentContainer: { padding: 20, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    headerTitle: { // Original headerTitle, now used in the new header structure
        fontSize: 22, // Slightly smaller to fit with buttons
        fontWeight: 'bold',
        color: '#FFFFFF', // Adjusted for gradient
        textAlign: 'center',
        flex: 1, // Allow title to take available space and center
    },
    section: {
        marginBottom: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // MODIFIED for gradient visibility (frosted glass effect)
        borderRadius: 8,
        padding: 16,
        // Shadow might not be very visible on dark gradient, consider removing or adjusting
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, // Reduced opacity
        shadowRadius: 1.00,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 20, fontWeight: '600', marginBottom: 16,
        color: '#FFFFFF', // MODIFIED for gradient
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.3)', // MODIFIED for gradient
        paddingBottom: 8
    },
    inputGroup: { marginBottom: 16 },
    label: {
        fontSize: 14, fontWeight: '500',
        color: '#DDDDDD', // MODIFIED for gradient
        marginBottom: 6
    },
    input: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // MODIFIED for gradient
        borderRadius: 6, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // MODIFIED for gradient
        color: '#FFFFFF', // MODIFIED for text input color
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    errorText: { fontSize: 12, color: '#FF9494', marginTop: 4 }, // Adjusted red for better visibility on dark gradient
    placeholderText: { color: '#BBBBBB' /* Adjusted for gradient inputs */ },
    dateButton: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // MODIFIED
        borderRadius: 6, paddingHorizontal: 12, minHeight: 44,
        backgroundColor: 'rgba(255, 255, 255, 0.15)' // MODIFIED
    },
    dateIcon: { marginRight: 8 /* color already set by Ionicons prop */ },
    dateText: {
        fontSize: 16,
        color: '#FFFFFF' // MODIFIED
    },
    pickerPlaceholder: { // Container for TextInput used as picker
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // MODIFIED
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // MODIFIED
        minHeight: 44, justifyContent: 'center'
    },
    interestInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    interestInput: { flex: 1 /* Styles inherited from .input */ },
    addButton: { // This button style is quite distinct, should work on gradient
        paddingHorizontal: 16, height: 44, justifyContent: 'center',
        backgroundColor: '#FF6347', // Primary action color
        borderRadius: 6
    },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
    badge: { // Badge style should work well
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6347',
        borderRadius: 15, paddingVertical: 5, paddingLeft: 10, paddingRight: 4,
    },
    badgeText: { color: '#fff', fontSize: 14, marginRight: 4 },
    removeBadgeButton: { padding: 2 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 10 },
    imageContainer: {
        width: '30%', aspectRatio: 1,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)', // MODIFIED
        borderRadius: 6, overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)', // MODIFIED
        position: 'relative',
    },
    imagePreview: { width: '100%', height: '100%' },
    removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    removeImageIcon: { /* Icon styles if needed */ },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', gap: 16 }, // MODIFIED borderTopColor
    button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100, flex: 1 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    submitButton: { backgroundColor: '#FF6347', }, // Main action button
    outlineButton: { // For "Select New Images" and "Cancel"
        borderWidth: 1,
        borderColor: '#FF6347', // Original orange for image selection
        backgroundColor: 'rgba(255,255,255,0.1)', // MODIFIED for gradient
    },
    outlineButtonText: { // For "Select New Images"
        color: '#FFDDC1', // Lighter orange for text on semi-transparent bg
        fontSize: 16, fontWeight: 'bold', textAlign: 'center'
    },
    cancelButton: { // Specifically for the bottom cancel button
        borderColor: 'rgba(255,255,255,0.5)', // Lighter border for cancel on gradient
    },
    // outlineButtonText color for Cancel button is directly set to #ccc in JSX
    buttonDisabled: { backgroundColor: '#cccccc', borderColor: '#cccccc', opacity: 0.7 },
});

export default EditProfileScreen;