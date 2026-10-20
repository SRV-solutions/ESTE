import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { C } from '../../src/lib/theme';

const TabIcon = ({ name, color, size, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
const icon = (name) => {
  const Icon = (props) => <TabIcon name={name} {...props} />;
  Icon.displayName = `TabIcon(${name})`;
  return Icon;
};

export default function TabsLayout() {
  const { can } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="orders" options={{ title: 'Órdenes', tabBarIcon: icon('clipboard'), href: can('serviceOrders', 'read') ? undefined : null }} />
      <Tabs.Screen name="items" options={{ title: 'Stock', tabBarIcon: icon('cube'), href: can('items', 'read') ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: 'Más', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
