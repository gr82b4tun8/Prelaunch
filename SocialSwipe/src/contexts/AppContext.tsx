// src/contexts/AppContext.tsx
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // Adjusted path

// --- Profile Type ---
export interface UserProfile { // Exporting in case other parts of your app might need this type directly
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures?: string[] | null;
    is_profile_complete: boolean;
}

// --- Auth Context Interface ---
interface AppState {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isProfileComplete: boolean;
    isLoadingSupabase: boolean;
    fetchProfile: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isProfileComplete, setIsProfileComplete] = useState(false);

    const fetchProfile = async (userId: string) => {
        if (!userId) return;
        console.log('Fetching profile for user:', userId);
        try {
            const { data, error, status } = await supabase
                .from('individual_profiles')
                .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, is_profile_complete')
                .eq('user_id', userId)
                .single();

            if (error && status !== 406) {
                console.error('Error fetching profile:', error.message);
                setProfile(null);
                setIsProfileComplete(false);
            } else if (data) {
                console.log('Profile data found:', data);
                setProfile(data as UserProfile);
                setIsProfileComplete(data.is_profile_complete || false);
            } else {
                console.log('No profile found for user, needs creation.');
                setProfile(null);
                setIsProfileComplete(false);
            }
        } catch (error: any) {
            console.error("Error in fetchProfile catch block:", error.message);
            setProfile(null);
            setIsProfileComplete(false);
        }
    };

    useEffect(() => {
        setIsLoadingSupabase(true);
        supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
            setSession(initialSession);
            const currentUserId = initialSession?.user?.id;
            setUser(initialSession?.user ?? null);
            if (currentUserId) {
                await fetchProfile(currentUserId);
            }
            setIsLoadingSupabase(false);
        }).catch(error => {
            console.error("Error getting initial session:", error);
            setIsLoadingSupabase(false);
        });

        const authListenerResponse = supabase.auth.onAuthStateChange(
            async (_event, currentAuthSession) => {
                console.log('Auth State Change:', _event, !!currentAuthSession);
                const currentAuthUser = currentAuthSession?.user ?? null;
                const currentAuthUserId = currentAuthUser?.id;

                setSession(currentAuthSession);
                setUser(currentAuthUser);

                if (currentAuthUserId) {
                    // Consider renaming isLoadingSupabase to something like isLoadingInitialAuth
                    // if this specific setIsLoadingSupabase(true) is only for profile fetching
                    // or ensure it correctly represents the loading state.
                    // For now, keeping as is.
                    setIsLoadingSupabase(true);
                    await fetchProfile(currentAuthUserId);
                    setIsLoadingSupabase(false);
                } else {
                    setProfile(null);
                    setIsProfileComplete(false);
                }
            }
        );

        return () => {
            authListenerResponse.data?.subscription?.unsubscribe();
        };
    }, []);

    const value = {
        session,
        user,
        profile,
        isProfileComplete,
        isLoadingSupabase,
        fetchProfile,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};