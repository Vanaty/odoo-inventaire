import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal';
  style?: ViewStyle;
}

export default function Logo({ size = 'medium', variant = 'default', style }: LogoProps) {
  const logoSource = require('@/assets/images/icon.png');
  
  const sizeStyles = {
    small: { width: 40, height: 40, borderRadius: 8 },
    medium: { width: 80, height: 80, borderRadius: 16 },
    large: { width: 120, height: 120, borderRadius: 20 }
  };

  const containerStyles = {
    default: styles.defaultContainer,
    minimal: styles.minimalContainer
  };

  return (
    <View style={[containerStyles[variant], style]}>
      <Image 
        source={logoSource} 
        style={[styles.logo, sizeStyles[size]]} 
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  minimalContainer: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  logo: {
    backgroundColor: '#F8FAFC',
  },
});
